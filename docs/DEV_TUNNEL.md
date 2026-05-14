# Dev tunnel — `dev.joaomvieira.com` → VM-hosted dev server

> [!warning] Temporary by design
> This runbook stands up a **dev-time** path to watch development from
> anywhere via the existing Cloudflare tunnel. It is *not* the production
> deploy — Phase 10 (see [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md))
> supersedes it with a real in-cluster app pod + a different Public
> Hostname.

## Architecture

```
   browser (anywhere)
        │
        ▼
   Cloudflare edge ─── Public Hostname: dev.joaomvieira.com → http://localhost:5173
        │
        ▼  existing tunnel
   k3s VM
   ├─ cloudflared pod (hostNetwork: true ← the change)
   │   └─ uses host's loopback to reach :5173
   │
   ├─ host process:  pnpm dev --host  (binds 0.0.0.0:5173)
   │
   └─ pod:           postgres in health-dashboard-ns
           ▲
           │ kubectl port-forward :5433 → :5432
           │
   host process: dev server connects to localhost:5433
```

Two patches make this work:

1. **`cloudflared` deployment** gets `hostNetwork: true` + `dnsPolicy: ClusterFirstWithHostNet` so its `localhost` is the VM's `localhost`.
2. **vite.config.ts** has a `DEV_TUNNEL=1` mode that allows the public hostname and serves HMR over `wss://dev.joaomvieira.com:443`.

`scripts/dev-server.sh` glues everything together.

## One-time setup

### 1. Get the project on the VM

```bash
ssh <your-vm>
git clone https://github.com/St4yToasty/health-dashboard.git
cd health-dashboard
pnpm install
cp .env.example .env.local
# Edit .env.local — DATABASE_URL will point at the port-forwarded Postgres
# at localhost:5433; INGEST_TOKEN should be a real value if you'll test the
# ingest pipeline from outside.
```

### 2. Apply the Postgres manifest

The k8s manifests live in a sibling repo, not this one. From the VM:

```bash
cd ~/devel/kubernetes-deployments        # or wherever you keep it
git pull                                  # pick up the new health-dashboard/ dir
```

Create the namespace + Secret (substitute a real password):

```bash
kubectl create namespace health-dashboard-ns

PG_PASS=$(openssl rand -base64 32)
kubectl -n health-dashboard-ns create secret generic health-dashboard-db \
  --from-literal=POSTGRES_USER=health \
  --from-literal=POSTGRES_PASSWORD="$PG_PASS" \
  --from-literal=POSTGRES_DB=health \
  --from-literal=DATABASE_URL="postgres://health:$PG_PASS@postgres:5432/health"

# Apply
kubectl apply -f ~/devel/kubernetes-deployments/health-dashboard/deployment.yaml

# Wait for ready
kubectl -n health-dashboard-ns get pods -w
```

Once Postgres is `Running` and `1/1 Ready`, run migrations + seed:

```bash
cd ~/health-dashboard

# Temporarily point at the in-cluster Postgres via port-forward so the
# migrate + seed scripts (which read DATABASE_URL from .env.local) can hit it:
kubectl -n health-dashboard-ns port-forward svc/postgres 5433:5432 &
PF=$!

# .env.local should already have DATABASE_URL=postgres://health:<pass>@localhost:5433/health
# (use the password you generated above)
pnpm db:migrate
pnpm db:seed

kill $PF
```

### 3. Patch the cloudflared deployment

In `~/devel/kubernetes-deployments/cloudflared/cloudflared.yaml`, add **two lines** inside the Deployment's `spec.template.spec` block (alongside `containers:`):

```yaml
spec:
  selector:
    matchLabels:
      app: cloudflared
  replicas: 1
  template:
    metadata:
      labels:
        app: cloudflared
    spec:
      hostNetwork: true                 # ← add
      dnsPolicy: ClusterFirstWithHostNet # ← add
      containers:
        - name: cloudflared
          image: cloudflare/cloudflared:latest
          # … rest unchanged …
```

What each line does:

- `hostNetwork: true` — the pod shares the VM's network namespace, so its `localhost` *is* the VM's `localhost`. Outbound to `http://localhost:5173` reaches the dev server.
- `dnsPolicy: ClusterFirstWithHostNet` — keeps CoreDNS working from inside the pod even with hostNetwork. Without this, cloudflared loses access to in-cluster names like `headlamp.headlamp-ns.svc.cluster.local`.

Apply:

```bash
kubectl apply -f ~/devel/kubernetes-deployments/cloudflared/cloudflared.yaml

# Force a fresh pod so hostNetwork takes effect
kubectl -n cloudflared-ns rollout restart deploy/cloudflared
kubectl -n cloudflared-ns rollout status deploy/cloudflared
```

### 4. Add the Public Hostname in Cloudflare

In the Cloudflare dashboard → **Zero Trust → Networks → Tunnels → (your tunnel) → Public Hostnames → Add a public hostname**:

| Field | Value |
|---|---|
| Subdomain | `dev` |
| Domain | `joaomvieira.com` |
| Path | (leave blank) |
| Service Type | HTTP |
| URL | `localhost:5173` |

Save. Cloudflare provisions the route within ~10 seconds.

(Skip the Access policy — this is a dev URL behind your own tunnel. Add Access later if you ever want to lock it down.)

### 5. Start the dev server

```bash
cd ~/health-dashboard
./scripts/dev-server.sh
```

The script:

1. Spawns `kubectl port-forward svc/postgres 5433:5432` in the background.
2. Waits until `localhost:5433` accepts connections.
3. Sets `DEV_TUNNEL=1` and `DEV_TUNNEL_HOST=dev.joaomvieira.com`.
4. Runs `pnpm dev --host`.
5. On Ctrl-C, cleanly stops the port-forward.

Visit **<https://dev.joaomvieira.com>**. HMR over the tunnel: edits on your laptop, pushed and pulled to the VM, hot-reload through Cloudflare.

## Day-to-day flow

On your laptop:

```bash
# … edit, commit, push to GitHub …
```

On the VM (in the `dev-server.sh` terminal):

```bash
Ctrl-C
git pull
pnpm install        # only if package.json changed
./scripts/dev-server.sh
```

Or skip the restart entirely and `git pull` while the server is running — Vite picks up the changes on next save (most of the time; SvelteKit config changes require a restart).

## When to undo

When Phase 10 deploys the SvelteKit app properly into the cluster, **delete** the Cloudflare Public Hostname for `dev.joaomvieira.com` (or repurpose it to point at the in-cluster Service) and revert `cloudflared.yaml` to remove `hostNetwork: true` if you want. The Postgres manifest stays — it's the same Postgres the prod app uses.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Cloudflare hostname returns `502 Bad Gateway` | cloudflared pod can't reach `localhost:5173` | Check the cloudflared pod is using `hostNetwork: true` (`kubectl -n cloudflared-ns get pod -o yaml \| grep hostNetwork`). Restart the deployment. |
| Page loads but HMR doesn't reload | `DEV_TUNNEL` not set, or `vite.config.ts` block not present | `./scripts/dev-server.sh` sets `DEV_TUNNEL=1` automatically. Confirm with `pnpm exec env \| grep DEV_TUNNEL` from inside the script. |
| `Postgres: connection refused` in load function | port-forward not running | The script does it; check `/tmp/dev-pg-forward.log`. Or run `kubectl -n health-dashboard-ns port-forward svc/postgres 5433:5432` manually. |
| Browser shows Vite's "Invalid Host header" page | `vite.config.ts` `allowedHosts` doesn't include the host being requested | Set `DEV_TUNNEL_HOST` env to match, or edit `vite.config.ts` to add the host to the list. |
| cloudflared pod logs say "Origin is reachable" but Postgres app calls fail | DNS issue — `dnsPolicy: ClusterFirstWithHostNet` not set | Re-apply the patched `cloudflared.yaml` and restart. |

## What this does NOT cover

- **Auth.** `dev.joaomvieira.com` is wide open via the tunnel. The dev DB has only seeded fixtures — no real health data — so the risk is low, but anyone with the URL gets full access. Lock it down with a Cloudflare Access policy if that matters.
- **TLS.** Cloudflare terminates HTTPS at the edge; the tunnel is encrypted. Local cloudflared → `localhost:5173` is plaintext over loopback, which is fine.
- **Backups.** Manual via `pg_dump` if you need it. v1 has no backup automation.
