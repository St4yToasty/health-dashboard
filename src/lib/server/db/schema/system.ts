import { sql } from 'drizzle-orm';
import {
	bigint,
	bigserial,
	boolean,
	check,
	date,
	index,
	inet,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp
} from 'drizzle-orm/pg-core';
import { goalMetric } from './enums';

/**
 * First-class goals with effective_from / effective_to windows.
 * Non-overlapping windows per metric are enforced by a GiST
 * exclusion constraint added in a hand-crafted migration after
 * the auto-generated one (see migrations/9999_gist_constraints.sql).
 */
export const goals = pgTable(
	'goals',
	{
		id: bigserial('id', { mode: 'bigint' }).primaryKey(),
		metric: goalMetric('metric').notNull(),
		targetValue: numeric('target_value', { precision: 8, scale: 2 }).notNull(),
		targetDate: date('target_date'),
		effectiveFrom: date('effective_from').notNull(),
		effectiveTo: date('effective_to'),
		notes: text('notes'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		check(
			'goals_effective_window',
			sql`${t.effectiveTo} is null or ${t.effectiveTo} > ${t.effectiveFrom}`
		),
		index('goals_metric_effective_from_idx').on(t.metric, sql`${t.effectiveFrom} desc`)
	]
);

/**
 * Raw payload archive. Lets us replay if the parser changes, and
 * debug HAE's behaviour. Retention: keep `payload` for 30 days,
 * then null it (status row stays for audit).
 */
export const ingestEvents = pgTable(
	'ingest_events',
	{
		id: bigserial('id', { mode: 'bigint' }).primaryKey(),
		receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
		sourceIp: inet('source_ip'),
		bytes: integer('bytes').notNull(),
		status: text('status').notNull(), // 'parsed' | 'error'
		error: text('error'),
		payload: jsonb('payload')
	},
	(t) => [index('ingest_events_received_at_idx').on(sql`${t.receivedAt} desc`)]
);

/**
 * Rule schema for the in-process reminder scheduler.
 * `condition_kind` discriminates the shape of `condition_params`; see
 * docs/REMINDERS.md for the supported kinds in v1.
 */
export const reminderRules = pgTable('reminder_rules', {
	id: bigserial('id', { mode: 'bigint' }).primaryKey(),
	name: text('name').notNull(),
	conditionKind: text('condition_kind').notNull(),
	conditionParams: jsonb('condition_params').notNull(),
	scheduleCron: text('schedule_cron').notNull(),
	channel: text('channel').notNull().default('telegram'),
	isActive: boolean('is_active').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

/** Audit log of every reminder evaluation that fired. */
export const reminderFires = pgTable(
	'reminder_fires',
	{
		id: bigserial('id', { mode: 'bigint' }).primaryKey(),
		ruleId: bigint('rule_id', { mode: 'bigint' })
			.notNull()
			.references(() => reminderRules.id, { onDelete: 'cascade' }),
		firedAt: timestamp('fired_at', { withTimezone: true }).notNull().defaultNow(),
		message: text('message').notNull(),
		deliveryStatus: text('delivery_status').notNull(), // 'sent' | 'failed' | 'suppressed_quiet_hours'
		deliveryError: text('delivery_error')
	},
	(t) => [index('reminder_fires_rule_fired_idx').on(t.ruleId, sql`${t.firedAt} desc`)]
);

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type IngestEvent = typeof ingestEvents.$inferSelect;
export type NewIngestEvent = typeof ingestEvents.$inferInsert;
export type ReminderRule = typeof reminderRules.$inferSelect;
export type NewReminderRule = typeof reminderRules.$inferInsert;
export type ReminderFire = typeof reminderFires.$inferSelect;
export type NewReminderFire = typeof reminderFires.$inferInsert;
