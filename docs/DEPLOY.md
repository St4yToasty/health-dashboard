# Deploy — k3s deployment runbook

How to get the dashboard running in the existing k3s cluster on the Proxmox VM. Follows the same pattern as `~/devel/kubernetes-deployments/bbs-tracker/`.

## Pre-requisites

- The Proxmox VM is up and `kubectl` is configured to point at it.
- The `cloudflared` deployment is already running (`kubectl get pods -n cloudflared-ns`).
- A Cloudflare-managed domain is available for the dashboard hostname.
- The image-import flow works on the node (verify with `kubectl get nodes` then SSH and check `k3s ctr images list`).

## One-time setup

### 1. Cloudflare configuration

In the Cloudflare dashboard:

1. **Zero Trust → Access → Tunnels → existing tunnel → Public Hostnames → Add:**
   - Subdomain + domain: `health.<your-domain>` (or whatever you choose).
   - Service: `http://health-dashboard.health-dashboard-ns:3000`.
2. **Zero Trust → Access → Applications → Add Application → Self-hosted:**
   - Application name: `Health Dashboard`.
   - Application domain: `health.<your-domain>`.
   - Identity providers: Google (or whichever you prefer).
   - Policy: `email is <your-email>` → Allow.
3. **Bypass policy for ingest:**
   - Add a second Application targeting the **same domain** but with **Path** = `/api/ingest`.
   - Action: **Bypass**.
   - Place this Application *above* the main Health Dashboard application in the precedence list so the bypass match wins.
4. Optionally repeat the bypass for `/api/health` if you want external monitors.

Result: visiting `https://health.<your-domain>/` goes through Access; visiting `https://health.<your-domain>/api/ingest` does not. The app then enforces the bearer token on ingest.

### 2. Secrets

All Secrets live in `health-dashboard-ns`. Create them manually — none are committed:

```bash
kubectl create namespace health-dashboard-ns

# Postgres
PG_PASSWORD=$(openssl rand -base64 32)
kubectl create secret generic health-dashboard-db \
  -n health-dashboard-ns \
  --from-literal=POSTGRES_USER=health \
  --from-literal=POSTGRES_PASSWORD="$PG_PASSWORD" \
  --from-literal=POSTGRES_DB=health \
  --from-literal=DATABASE_URL="postgres://health:$PG_PASSWORD@postgres:5432/health"

# HAE bearer
INGEST_TOKEN=$(openssl rand -hex 32)
kubectl create secret generic health-dashboard-ingest \
  -n health-dashboard-ns \
  --from-literal=INGEST_TOKEN="$INGEST_TOKEN"
echo "INGEST_TOKEN (paste into HAE): $INGEST_TOKEN"

# Telegram
kubectl create secret generic health-dashboard-telegram \
  -n health-dashboard-ns \
  --from-literal=TELEGRAM_BOT_TOKEN="<from @BotFather>" \
  --from-literal=TELEGRAM_CHAT_ID="<your numeric chat id>"
```

See `REMINDERS.md` for how to obtain the Telegram values.

### 3. Manifests

The deployment YAML lives in **the kubernetes-deployments repo**, not in this app repo:

```
~/devel/kubernetes-deployments/health-dashboard/deployment.yaml
```

It bundles namespace + PVC + Postgres deployment + app deployment + services, mirroring the bbs-tracker structure. The first version is created once and then committed to that repo.

To apply:

```bash
kubectl apply -f ~/devel/kubernetes-deployments/health-dashboard/deployment.yaml
```

To remove everything (DB included — destructive):

```bash
kubectl delete -f ~/devel/kubernetes-deployments/health-dashboard/deployment.yaml
```

## Build & ship a new image

The image is built **locally** in WSL and **loaded directly into the k3s node**'s containerd. No registry. Pattern matches bbs-tracker.

```bash
# In this repo
VERSION=$(date +%Y%m%d-%H%M)         # or a semver bump

# 1. Build
docker build -t health-dashboard:v$VERSION .

# 2. Save to tarball
docker save health-dashboard:v$VERSION -o /tmp/health-dashboard.tar

# 3. Copy to the cluster node (replace <node-host>)
scp /tmp/health-dashboard.tar <node-host>:/tmp/

# 4. Import on the node
ssh <node-host> "sudo k3s ctr images import /tmp/health-dashboard.tar && rm /tmp/health-dashboard.tar"

# 5. Update the manifest's image tag and re-apply
sed -i "s|image: health-dashboard:.*|image: health-dashboard:v$VERSION|" \
  ~/devel/kubernetes-deployments/health-dashboard/deployment.yaml
kubectl apply -f ~/devel/kubernetes-deployments/health-dashboard/deployment.yaml
```

A small `scripts/deploy.sh` in this repo wraps the above; see `DEVELOPMENT.md`.

## Manifest skeleton

The actual file will be assembled when we start coding. Here's the intended shape:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: health-dashboard-ns
  labels: { name: health-dashboard-ns }
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: health-dashboard-ns
spec:
  accessModes: [ReadWriteOnce]
  resources: { requests: { storage: 5Gi } }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: health-dashboard-ns
spec:
  replicas: 1
  strategy: { type: Recreate }
  selector: { matchLabels: { app: postgres } }
  template:
    metadata: { labels: { app: postgres } }
    spec:
      terminationGracePeriodSeconds: 30
      securityContext: { fsGroup: 999 }
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports: [{ containerPort: 5432, name: pg }]
          envFrom:
            - secretRef: { name: health-dashboard-db }
          readinessProbe:
            exec: { command: [pg_isready, -U, health] }
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            exec: { command: [pg_isready, -U, health] }
            initialDelaySeconds: 30
            periodSeconds: 30
          volumeMounts:
            - { name: data, mountPath: /var/lib/postgresql/data, subPath: pgdata }
          resources:
            requests: { cpu: 50m, memory: 128Mi }
            limits:   { cpu: 500m, memory: 512Mi }
      volumes:
        - name: data
          persistentVolumeClaim: { claimName: postgres-data }
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: health-dashboard-ns
spec:
  ports: [{ port: 5432, targetPort: 5432, name: pg }]
  selector: { app: postgres }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: health-dashboard
  namespace: health-dashboard-ns
spec:
  replicas: 1
  strategy: { type: Recreate }
  selector: { matchLabels: { app: health-dashboard } }
  template:
    metadata: { labels: { app: health-dashboard } }
    spec:
      terminationGracePeriodSeconds: 15
      containers:
        - name: app
          image: health-dashboard:v0.0.1
          imagePullPolicy: Never
          ports: [{ containerPort: 3000, name: http }]
          env:
            - { name: NODE_ENV, value: production }
            - { name: PORT, value: "3000" }
            - { name: TZ, value: Europe/Lisbon }
          envFrom:
            - secretRef: { name: health-dashboard-db }
            - secretRef: { name: health-dashboard-ingest }
            - secretRef: { name: health-dashboard-telegram }
          readinessProbe:
            httpGet: { path: /api/health, port: 3000 }
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet: { path: /api/health, port: 3000 }
            initialDelaySeconds: 30
            periodSeconds: 30
          resources:
            requests: { cpu: 50m, memory: 128Mi }
            limits:   { cpu: 500m, memory: 512Mi }
---
apiVersion: v1
kind: Service
metadata:
  name: health-dashboard
  namespace: health-dashboard-ns
spec:
  ports: [{ port: 3000, targetPort: 3000, name: http }]
  selector: { app: health-dashboard }
```

## First-time deployment runbook

1. Cloudflare hostname + Access apps configured (above).
2. Secrets created (above).
3. `kubectl apply` the manifest.
4. Wait for both pods to be `Ready`:
   `kubectl -n health-dashboard-ns get pods -w`.
5. Run migrations once: `kubectl -n health-dashboard-ns exec deploy/health-dashboard -- node scripts/migrate.js up` (exact command depends on the migration tool we pick).
6. Smoke-test: visit `https://health.<your-domain>/` — Access login, then the empty home screen.
7. Smoke-test ingest:
   ```bash
   curl -X POST https://health.<your-domain>/api/ingest \
     -H "Authorization: Bearer $INGEST_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"data":{"metrics":[]}}'   # expect 200 with 0 ingested
   ```
8. Configure HAE on the phone (see `INGEST.md`).
9. Trigger a one-off "All time" HAE export to backfill.

## Backups

- **Postgres dump weekly.** Add a `CronJob` later that runs `pg_dump` and writes to a PVC or off-cluster store.
- v1 backup story is *manual*: run `pg_dump` from your laptop after a `kubectl port-forward` if you care about a specific moment.

## Rotation / secrets hygiene

- `INGEST_TOKEN` rotation: generate a new one, update both the Secret and HAE's config, restart the app deployment.
- Postgres password rotation: harder (requires app restart + `ALTER USER`); only do if compromised.
- Telegram bot token rotation: regenerate via @BotFather, update Secret, restart.

## Troubleshooting

| Symptom                                          | Check                                                      |
|--------------------------------------------------|------------------------------------------------------------|
| 502 from the public hostname                     | `kubectl -n cloudflared-ns logs deploy/cloudflared`        |
| App pod CrashLoopBackoff                          | `kubectl -n health-dashboard-ns logs deploy/health-dashboard --previous` |
| HAE export 401s                                  | Verify the Authorization header in HAE matches the Secret  |
| HAE export goes to login page                    | The Bypass Access policy isn't matching `/api/ingest`       |
| `prefers-color-scheme` not respected in PWA      | Check the manifest's `theme_color`                          |
| Postgres data lost on rollout                     | Confirm PVC is bound: `kubectl -n health-dashboard-ns get pvc` |
