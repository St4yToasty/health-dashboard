CREATE TYPE "public"."goal_metric" AS ENUM('daily_calories', 'daily_water_ml', 'daily_steps', 'target_weight_kg');--> statement-breakpoint
CREATE TYPE "public"."meal_kind" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "public"."metric_source" AS ENUM('apple_health', 'manual', 'import', 'derived');--> statement-breakpoint
CREATE TYPE "public"."sleep_stage" AS ENUM('in_bed', 'asleep', 'core', 'deep', 'rem', 'awake');--> statement-breakpoint
CREATE TYPE "public"."workout_kind" AS ENUM('walking', 'running', 'cycling', 'strength', 'hiit', 'yoga', 'swimming', 'other');--> statement-breakpoint
CREATE TABLE "body_composition" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"weight_kg" numeric(5, 2),
	"body_fat_pct" numeric(4, 2),
	"muscle_mass_kg" numeric(5, 2),
	"bmi" numeric(4, 2),
	"source" "metric_source" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "body_composition_recorded_at_source_key" UNIQUE("recorded_at","source"),
	CONSTRAINT "body_composition_at_least_one_value" CHECK ("body_composition"."weight_kg" is not null or "body_composition"."body_fat_pct" is not null or "body_composition"."muscle_mass_kg" is not null)
);
--> statement-breakpoint
CREATE TABLE "body_measurements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"waist_cm" numeric(5, 1),
	"chest_cm" numeric(5, 1),
	"hips_cm" numeric(5, 1),
	"thigh_cm" numeric(5, 1),
	"arm_cm" numeric(5, 1),
	"neck_cm" numeric(5, 1),
	"source" "metric_source" DEFAULT 'manual' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "body_measurements_recorded_at_source_key" UNIQUE("recorded_at","source"),
	CONSTRAINT "body_measurements_at_least_one" CHECK (coalesce("body_measurements"."waist_cm", "body_measurements"."chest_cm", "body_measurements"."hips_cm", "body_measurements"."thigh_cm", "body_measurements"."arm_cm", "body_measurements"."neck_cm") is not null)
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"serving_grams" numeric(7, 2) NOT NULL,
	"kcal" numeric(6, 1) NOT NULL,
	"protein_g" numeric(5, 1) NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "foods_name_brand_key" UNIQUE("name","brand")
);
--> statement-breakpoint
CREATE TABLE "meal_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"meal_id" bigint NOT NULL,
	"food_id" bigint NOT NULL,
	"grams" numeric(7, 2) NOT NULL,
	"kcal" numeric(6, 1) NOT NULL,
	"protein_g" numeric(5, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"eaten_at" timestamp with time zone NOT NULL,
	"kind" "meal_kind" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "water_intake" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"amount_ml" integer NOT NULL,
	"source" "metric_source" DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "water_intake_amount_range" CHECK ("water_intake"."amount_ml" > 0 and "water_intake"."amount_ml" <= 5000)
);
--> statement-breakpoint
CREATE TABLE "daily_activity" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"steps" integer,
	"distance_m" integer,
	"active_energy_kcal" integer,
	"basal_energy_kcal" integer,
	"flights_climbed" integer,
	"source" "metric_source" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_activity_day_source_key" UNIQUE("day","source")
);
--> statement-breakpoint
CREATE TABLE "sleep_sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"in_bed_min" integer,
	"asleep_min" integer,
	"deep_min" integer,
	"rem_min" integer,
	"core_min" integer,
	"awake_min" integer,
	"source" "metric_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sleep_sessions_started_source_key" UNIQUE("started_at","source"),
	CONSTRAINT "sleep_sessions_time_order" CHECK ("sleep_sessions"."ended_at" > "sleep_sessions"."started_at")
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"kind" "workout_kind" NOT NULL,
	"active_energy_kcal" integer,
	"distance_m" integer,
	"avg_hr" integer,
	"max_hr" integer,
	"notes" text,
	"source" "metric_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workouts_started_kind_source_key" UNIQUE("started_at","kind","source"),
	CONSTRAINT "workouts_time_order" CHECK ("workouts"."ended_at" > "workouts"."started_at")
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"metric" "goal_metric" NOT NULL,
	"target_value" numeric(8, 2) NOT NULL,
	"target_date" date,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_effective_window" CHECK ("goals"."effective_to" is null or "goals"."effective_to" > "goals"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "ingest_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source_ip" "inet",
	"bytes" integer NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "reminder_fires" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rule_id" bigint NOT NULL,
	"fired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"message" text NOT NULL,
	"delivery_status" text NOT NULL,
	"delivery_error" text
);
--> statement-breakpoint
CREATE TABLE "reminder_rules" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"condition_kind" text NOT NULL,
	"condition_params" jsonb NOT NULL,
	"schedule_cron" text NOT NULL,
	"channel" text DEFAULT 'telegram' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_fires" ADD CONSTRAINT "reminder_fires_rule_id_reminder_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."reminder_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "body_composition_recorded_at_idx" ON "body_composition" USING btree ("recorded_at" desc);--> statement-breakpoint
CREATE INDEX "foods_name_lower_idx" ON "foods" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "meal_items_meal_id_idx" ON "meal_items" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX "meals_eaten_at_idx" ON "meals" USING btree ("eaten_at" desc);--> statement-breakpoint
CREATE INDEX "water_intake_recorded_at_idx" ON "water_intake" USING btree ("recorded_at" desc);--> statement-breakpoint
CREATE INDEX "daily_activity_day_idx" ON "daily_activity" USING btree ("day" desc);--> statement-breakpoint
CREATE INDEX "sleep_sessions_started_at_idx" ON "sleep_sessions" USING btree ("started_at" desc);--> statement-breakpoint
CREATE INDEX "workouts_started_at_idx" ON "workouts" USING btree ("started_at" desc);--> statement-breakpoint
CREATE INDEX "goals_metric_effective_from_idx" ON "goals" USING btree ("metric","effective_from" desc);--> statement-breakpoint
CREATE INDEX "ingest_events_received_at_idx" ON "ingest_events" USING btree ("received_at" desc);--> statement-breakpoint
CREATE INDEX "reminder_fires_rule_fired_idx" ON "reminder_fires" USING btree ("rule_id","fired_at" desc);--> statement-breakpoint
CREATE VIEW "public"."daily_nutrition" AS (
		select
			date_trunc('day', m.eaten_at at time zone 'Europe/Lisbon')::date as day,
			sum(mi.kcal)::numeric(7, 1) as kcal,
			sum(mi.protein_g)::numeric(6, 1) as protein_g,
			count(distinct m.id) as meal_count
		from meals m
		join meal_items mi on mi.meal_id = m.id
		group by 1
	);--> statement-breakpoint
CREATE VIEW "public"."goals_active" AS (
		select distinct on (metric)
			metric,
			target_value,
			target_date,
			effective_from,
			effective_to
		from goals
		where current_date >= effective_from
			and (effective_to is null or current_date < effective_to)
		order by metric, effective_from desc
	);