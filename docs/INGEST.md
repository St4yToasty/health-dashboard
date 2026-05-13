# Ingest — HealthAutoExport integration

Spec for the `/api/ingest` endpoint that HealthAutoExport (HAE) posts to.

## Endpoint

```
POST  https://<dashboard-hostname>/api/ingest
Headers:
  Authorization: Bearer <INGEST_TOKEN>
  Content-Type: application/json
Body: HAE JSON payload (see §Payload)
```

- **Cloudflare Access bypass policy** must cover this exact path so HAE can reach it without the human-login flow.
- Bearer token is generated once (`openssl rand -hex 32`), stored in the `health-dashboard-ingest` Secret, and configured in HAE's "Automation" → "REST API" → "Authorization Header" field.

## HealthAutoExport configuration (on the iPhone)

1. Open HealthAutoExport.
2. **Automations → REST API**:
   - **URL:** `https://<hostname>/api/ingest`
   - **Method:** POST
   - **Headers:** `Authorization: Bearer <token>`
   - **Aggregate:** All quantities, all workouts, sleep analysis.
   - **Period:** every 6 hours (4× / day). HAE will only export the window since the last successful run.
   - **Format:** JSON.
3. **Required permissions in Apple Health → Sources → HealthAutoExport:** read access for every category we ingest (weight, body fat, lean body mass, dietary energy, dietary water, steps, distance, active energy, workouts, sleep analysis, heart rate, etc. — even categories we ignore in v1, so we don't have to re-grant later).
4. Save. The first export runs immediately.

## Auth

- Constant-time compare of `Authorization` header against `INGEST_TOKEN` env var.
- On mismatch: `401 Unauthorized`, no body. Log to `ingest_events` with `status='error', error='auth'`.
- Rate limit: 1 request / 5 s per IP at the app layer (enough headroom for HAE's pattern; pushes back on misuse).

## Payload

HAE's JSON shape (simplified, real payloads have more fields we ignore):

```json
{
  "data": {
    "metrics": [
      {
        "name": "weight_body_mass",
        "units": "kg",
        "data": [
          { "date": "2026-05-13 07:42:00 +0100", "qty": 82.4, "source": "Withings" }
        ]
      },
      {
        "name": "dietary_water",
        "units": "ml",
        "data": [
          { "date": "2026-05-13 09:15:00 +0100", "qty": 250 }
        ]
      },
      {
        "name": "step_count",
        "units": "count",
        "data": [
          { "date": "2026-05-13 00:00:00 +0100", "qty": 7432, "source": "Huawei Health" }
        ]
      }
      // ...
    ],
    "workouts": [
      {
        "name": "Walking",
        "start": "2026-05-13 18:10:00 +0100",
        "end":   "2026-05-13 18:42:00 +0100",
        "totalActiveEnergyBurned": { "qty": 158, "units": "kcal" },
        "totalDistance":           { "qty": 2630, "units": "m" },
        "avgHeartRate":            { "qty": 124, "units": "bpm" }
      }
    ],
    "sleep_analysis": [
      {
        "startDate": "2026-05-12 23:30:00 +0100",
        "endDate":   "2026-05-13 07:10:00 +0100",
        "inBed":  460,
        "asleep": 432,
        "deep":   78,
        "rem":    104,
        "core":   210,
        "awake":  28,
        "source": "Sleep Cycle"
      }
    ]
  }
}
```

## Mapping (HAE → our tables)

| HAE metric name              | Our table             | Column(s)                           | Notes                                                            |
|------------------------------|-----------------------|-------------------------------------|------------------------------------------------------------------|
| `weight_body_mass`           | `body_composition`    | `weight_kg`                         |                                                                  |
| `body_fat_percentage`        | `body_composition`    | `body_fat_pct`                      | Merge into same row as weight if same minute, else separate row |
| `lean_body_mass`             | `body_composition`    | `muscle_mass_kg`                    | HAE calls it lean body mass; we store as muscle_mass_kg          |
| `dietary_energy`             | (ignored v1)          | —                                   | We log nutrition manually; HAE's number would double-count       |
| `protein`                    | (ignored v1)          | —                                   | Same reason                                                      |
| `dietary_water`              | `water_intake`        | `amount_ml`                         | Each HAE row → one row in our table                              |
| `step_count`                 | `daily_activity`      | `steps`                             | Day-bucketed                                                     |
| `distance_walking_running`   | `daily_activity`      | `distance_m`                        |                                                                  |
| `active_energy`              | `daily_activity`      | `active_energy_kcal`                |                                                                  |
| `basal_energy_burned`        | `daily_activity`      | `basal_energy_kcal`                 |                                                                  |
| `flights_climbed`            | `daily_activity`      | `flights_climbed`                   |                                                                  |
| `workouts[]`                 | `workouts`            | All columns                         | One row per workout                                              |
| `sleep_analysis[]`           | `sleep_sessions`      | All columns                         | One row per session                                              |
| HR metrics (resting / HRV)   | (v2)                  | —                                   | Will land in `vitals_hr` in v2                                   |

A workout's `name` field maps to our `workout_kind` enum via a small lookup table (HAE strings → our enum). Unknown values fall back to `other`.

## Idempotency

Every insert uses `ON CONFLICT` against the metric's unique constraint:

- `body_composition`: `(recorded_at, source)` → if conflict, update non-null columns.
- `water_intake`: no constraint; HAE-sourced water rows include a synthetic `recorded_at` precise to the second, which is fine.
- `daily_activity`: `(day, source)` → on conflict, overwrite all aggregate columns (HAE keeps recalculating "today's steps" all day).
- `workouts`: `(started_at, kind, source)`.
- `sleep_sessions`: `(started_at, source)`.

The unique constraint always includes `source` so manual-entered rows and HAE-imported rows can coexist for the same instant.

## Backfill

The same endpoint handles bulk historical imports.

1. In HAE: **Export → Date Range = All → Format = JSON → Share Sheet → "Copy Link"** (HAE may also let you POST it directly via the same Automation flow with date range set to "All time" for a one-off run).
2. POST the file to `/api/ingest`. Streaming JSON parsing on the server side; no in-memory load of the whole payload.
3. Same idempotent inserts. Re-running the backfill is safe.

Backfill considerations:

- Payloads can be > 100 MB if the Apple Health history is several years deep. The endpoint accepts up to **256 MB** and streams.
- Backfill rows are stored with `source = 'apple_health'` (not `'import'`) — they're the same data shape as ongoing pushes. Use `'import'` only for non-HAE one-time imports (e.g. importing from MyFitnessPal CSV in v2).

## Errors

| Condition                        | Status | Body                                  |
|----------------------------------|--------|----------------------------------------|
| Missing / wrong bearer            | 401    | empty                                  |
| Body not JSON                     | 400    | `{"error": "invalid_json"}`            |
| JSON parses but unrecognized shape | 400    | `{"error": "unrecognized_payload"}`    |
| Partial parse failure (some metrics OK) | 207 | `{"ingested": N, "errors": [...]}`  |
| Internal error during DB write    | 500    | `{"error": "internal"}`                |

Every request is logged to `ingest_events`. On error, the raw payload is preserved (`status='error'`).

## Health probe

```
GET /api/health
→ 200 { "ok": true, "ts": "2026-05-13T15:30:00Z" }
```

No auth. CF Access bypass also applies (so external monitors can hit it). Returns just enough to confirm the app and Postgres are both reachable (writes a no-op timestamp to a heartbeat table).

## Testing locally

```bash
INGEST_TOKEN=devtoken pnpm dev

curl -X POST http://localhost:5173/api/ingest \
  -H 'Authorization: Bearer devtoken' \
  -H 'Content-Type: application/json' \
  -d @samples/hae-minimal.json
```

Sample payloads live in `samples/` (small hand-crafted JSONs covering each metric type). Commit them so we can replay during dev.

## Known HAE quirks

- HAE timestamps are in the iPhone's current local time zone but include the offset, so they parse cleanly. Don't strip the offset.
- HAE may push the **same row twice** if a previous Automation run partially failed. That's why idempotency is non-negotiable.
- HAE's "dietary water" rows can fragment a single drink into multiple sub-rows (Apple Health does this internally). We accept this — `water_intake` is additive.
- Huawei Health → Apple Health → HAE: workouts often come through but with missing `avgHeartRate` and sometimes missing distance. Handle nulls gracefully.
