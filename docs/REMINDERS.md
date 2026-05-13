# Reminders — Telegram bot (v1)

Spec for v1's reminder system. One channel: Telegram. Email and iOS Shortcuts are v2.

## Why Telegram

- Free, no SMTP setup, no DNS records.
- One bot token + one chat ID → push notifications to the phone for free.
- Reliable delivery (Telegram is one of the most stable messaging APIs).
- iOS notification UX is clean.

## Bot setup

One-time, on the iPhone (or any Telegram client):

1. Open Telegram → search `@BotFather` → `/newbot`.
2. Choose a name (e.g. "Health Dashboard") and a username (e.g. `joao_health_bot`).
3. BotFather replies with a bot token (`123456:ABC-DEF...`). **This goes into the `health-dashboard-telegram` Secret.**
4. Send any message to the new bot to start a chat. Then:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
   ```
   The response includes a numeric `chat.id`. That's your `TELEGRAM_CHAT_ID`. Save it.
5. (Optional) Set commands via `@BotFather → /setcommands` so the bot exposes `/today`, `/log_water`, etc.

## Sending a message (server side)

```ts
async function sendTelegram(text: string) {
  const r = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'MarkdownV2',
        disable_notification: false,
      }),
    },
  );
  if (!r.ok) throw new Error(`telegram ${r.status}: ${await r.text()}`);
}
```

Outbound HTTPS only — no inbound webhook for v1. The bot doesn't *respond* to commands; it just pushes reminders. (Adding inbound webhook support is a v2 nice-to-have for `/log_water 250` style commands.)

## Scheduler

In-process. The SvelteKit `hooks.server.ts` starts a single interval on app boot (`setInterval(tick, 60_000)`).

Each `tick()`:

1. Reads all `reminder_rules` where `is_active = true`.
2. For each rule, computes whether the current minute matches its `schedule_cron`.
3. If matched, evaluates the rule's condition against the DB.
4. If the condition fires, sends the message and writes a row to `reminder_fires`.
5. Uses `(rule_id, day)` keys in `reminder_fires` to prevent double-fires.

Why in-process rather than k8s CronJob:
- Single-replica app + dataset is tiny → a 60-second interval inside the same process is simpler and avoids a second moving part.
- If the pod restarts mid-window, missed reminders just don't fire for that window — acceptable for "log your water" nudges.

## Rule schema recap

(See `DATA_MODEL.md` for the table DDL.)

```sql
reminder_rules
  id, name, condition_kind, condition_params (jsonb), schedule_cron, channel, is_active
```

### `condition_kind` values for v1

| Kind                       | `condition_params` shape                                              | Fires when                                                                 |
|----------------------------|-----------------------------------------------------------------------|----------------------------------------------------------------------------|
| `no_metric_since`          | `{ "metric": "water_intake", "hours": 3 }`                            | No row in the metric's table for the last N hours (within "active" hours)  |
| `no_metric_today_by`       | `{ "metric": "body_composition", "by_hour": 10 }`                     | Today still has no row in the metric's table by HH:00 local                |
| `goal_progress_above`      | `{ "goal": "daily_calories", "percent": 90 }`                         | Today's total reaches X% of the active goal                                |
| `goal_progress_below`      | `{ "goal": "daily_water_ml", "percent": 50, "by_hour": 18 }`          | By hour HH local, today's progress is below X%                             |
| `streak_milestone`         | `{ "metric": "weight_logged", "days": 7 }`                            | N consecutive days of logging                                              |
| `summary`                  | `{ "include": ["weight","calories","steps","water"] }`                | Always — used for daily 8am or 9pm summary                                 |

Each kind has a small evaluator in `src/lib/server/reminders/conditions.ts`. New kinds are added as needed (cheap — each is ~20 lines).

## Seed rules for v1

Inserted by the initial migration / seed script so the system is useful day one:

```sql
insert into reminder_rules (name, condition_kind, condition_params, schedule_cron) values

-- Morning nudge if no weight logged
('No weight logged by 10am', 'no_metric_today_by',
  '{"metric":"body_composition","by_hour":10}',
  '0 10 * * *'),

-- Water nudge every 3 hours during the day if dry
('No water for 3h (daytime)', 'no_metric_since',
  '{"metric":"water_intake","hours":3,"active_hours":[9,21]}',
  '0 9,12,15,18,21 * * *'),

-- Calorie ceiling warning
('Approaching daily calories', 'goal_progress_above',
  '{"goal":"daily_calories","percent":90}',
  '*/30 * * * *'),

-- Evening summary
('Daily summary', 'summary',
  '{"include":["weight","calories","steps","water","sleep"]}',
  '0 21 * * *'),

-- Steps lagging
('Steps lagging by 6pm', 'goal_progress_below',
  '{"goal":"daily_steps","percent":60,"by_hour":18}',
  '0 18 * * *');
```

The user can edit/disable rules from the Settings page (built later).

## Message format

- Use MarkdownV2 for emphasis. Keep messages short (1–3 lines).
- Include actionable numbers, not vague reminders.
- Never use emojis as the *only* signal — pair with text.

Examples:

```
*Water check* — last logged 3h ago.
You're at 750 / 2500 ml today.
```

```
*Daily summary* — Tue, May 13
Weight 82.4 kg (▼ 0.3 from yesterday)
Calories 1640 / 1800 — 160 left
Steps 7,432 / 8,000
Water 2.1 / 2.5 L
Sleep 7h 12m
```

```
*Heads up* — 90% of daily calories logged.
1620 / 1800 kcal. 180 left.
```

## Anti-spam guardrails

- **Quiet hours:** no messages between 22:00 and 08:00 unless the rule explicitly opts in. Implemented in the scheduler `tick()` — the rule fires but the message is dropped, logged as `delivery_status='suppressed_quiet_hours'`.
- **Daily cap:** max 6 reminder messages per day across all rules (excluding the daily summary). After the cap, additional fires are logged but not sent.
- **Snooze:** a Settings toggle to silence the bot for 24h. Persists in the DB (`reminder_snooze_until`).

## Failure handling

- Telegram API failures: log to `reminder_fires.delivery_error`, retry once after 30 s, then give up.
- If the bot token is missing in env, the scheduler logs a warning at boot and disables itself (no crashing the app).
- Network failures while sending don't roll back the rule's "fired" record — we mark it as `failed` so it doesn't re-fire the same minute and spam the user when connectivity returns.

## v2 additions

- **Email channel** (SMTP via Resend or similar). Same rule schema, different dispatcher.
- **iOS Shortcuts pull endpoint:** `GET /api/today` returns a compact JSON the user's Shortcut formats into a native iOS notification. Removes server-side push entirely for that channel.
- **Inbound Telegram commands:** `/log_water 250`, `/today`, `/weight 82.3` — bot becomes interactive.
- **Per-rule channel routing:** UI lets each rule pick its channel(s).
