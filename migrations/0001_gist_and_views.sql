-- Postgres extensions ────────────────────────────────────────────────────
-- btree_gist enables GiST indexes / exclusion constraints on btree types
-- like text and enums. Required by the non-overlapping-goals constraint
-- below.

CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint

-- Goals: non-overlapping date ranges per metric ──────────────────────────
-- Each (metric, effective_from..effective_to] window must not overlap
-- another window for the same metric. Drizzle's schema DSL can't express
-- exclusion constraints, so this is hand-written here.
--
-- effective_to is nullable; an open-ended window is represented as
-- [effective_from, infinity).
--
-- (Views are generated automatically from pgView definitions in
-- src/lib/server/db/schema/views.ts — they appear in the auto-generated
-- migration 0000, not here.)

ALTER TABLE "goals"
	ADD CONSTRAINT "goals_no_overlap_per_metric"
	EXCLUDE USING gist (
		"metric" WITH =,
		daterange("effective_from", coalesce("effective_to", 'infinity'::date)) WITH &&
	);
