// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import { check, index, pgTableCreator, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `memento_${name}`);

export const posts = createTable(
	"post",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		name: d.varchar({ length: 256 }),
		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [index("name_idx").on(t.name)],
);

export const users = createTable(
	"user",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: d.text().notNull(),
		clerkUserId: d.text().notNull(),

		timezone: d.text().notNull().default("America/New_York"),
		email: d.text(),
		name: d.text(),
		imageUrl: d.text(),

		calendarConnected: d.boolean().notNull().default(false),
		calendarConnectionStatus: d.text(),
		calendarScopes: d.text().array(),
		calendarLastSyncAt: d.timestamp({ withTimezone: true }),
		calendarSyncError: d.text(),

		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		uniqueIndex("user_public_id_idx").on(t.publicId),
		uniqueIndex("user_clerk_user_id_idx").on(t.clerkUserId),
		index("user_calendar_connected_idx").on(t.calendarConnected),
		check(
			"user_calendar_connection_status_enum",
			sql`${t.calendarConnectionStatus} is null or ${t.calendarConnectionStatus} in ('connected','expired','revoked','error')`,
		),
	],
);

export const activities = createTable(
	"activity",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: d.text().notNull(),

		sourceType: d.text().notNull(), // curated | user
		createdByUserId: d.integer().references(() => users.id, {
			onDelete: "cascade",
		}),

		title: d.text().notNull(),
		description: d.text(),

		latitude: d.doublePrecision().notNull(),
		longitude: d.doublePrecision().notNull(),
		radiusMeters: d.integer(),

		days: d.text().notNull(), // weekday | weekend | any
		specificDates: d.date().array(),

		timeOfDay: d.text(), // early-morning | ... | late-night
		startTime: d.time(),
		endTime: d.time(),

		category: d.text().notNull(), // food | nature | entertainment | social

		minDurationMinutes: d.integer(),
		maxDurationMinutes: d.integer(),
		isIndoor: d.boolean(),
		costLevel: d.smallint(),
		tags: d.text().array().notNull().default(sql`'{}'::text[]`),

		isActive: d.boolean().notNull().default(true),
		priority: d.smallint().notNull().default(0),

		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
		updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
	}),
	(t) => [
		uniqueIndex("activity_public_id_idx").on(t.publicId),
		index("activity_source_type_idx").on(t.sourceType),
		index("activity_created_by_user_id_idx").on(t.createdByUserId),
		index("activity_category_idx").on(t.category),
		index("activity_location_idx").on(t.latitude, t.longitude),
		check(
			"activity_source_type_enum",
			sql`${t.sourceType} in ('curated','user')`,
		),
		check("activity_days_enum", sql`${t.days} in ('weekday','weekend','any')`),
		check(
			"activity_category_enum",
			sql`${t.category} in ('food','nature','entertainment','social')`,
		),
		check(
			"activity_time_of_day_enum",
			sql`${t.timeOfDay} is null or ${t.timeOfDay} in ('early-morning','morning','late-morning','afternoon','evening','night','late-night')`,
		),
		check(
			"activity_cost_level_range",
			sql`${t.costLevel} is null or (${t.costLevel} >= 0 and ${t.costLevel} <= 3)`,
		),
		check(
			"activity_time_range_order",
			sql`${t.startTime} is null or ${t.endTime} is null or ${t.startTime} <= ${t.endTime}`,
		),
		check(
			"activity_source_type_owner_guard",
			sql`(${t.sourceType} = 'curated' and ${t.createdByUserId} is null) or (${t.sourceType} = 'user' and ${t.createdByUserId} is not null)`,
		),
	],
);

export const recommendationNotes = createTable(
	"recommendation_note",
	(d) => ({
		id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
		publicId: d.text().notNull(),

		userId: d
			.integer()
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		activityId: d
			.integer()
			.notNull()
			.references(() => activities.id, { onDelete: "cascade" }),

		slotStartAt: d.timestamp({ withTimezone: true }).notNull(),
		slotEndAt: d.timestamp({ withTimezone: true }).notNull(),
		note: d.text().notNull(),

		createdAt: d
			.timestamp({ withTimezone: true })
			.$defaultFn(() => /* @__PURE__ */ new Date())
			.notNull(),
	}),
	(t) => [
		uniqueIndex("recommendation_note_public_id_idx").on(t.publicId),
		index("recommendation_note_user_id_idx").on(t.userId),
		index("recommendation_note_activity_id_idx").on(t.activityId),
		index("recommendation_note_slot_start_idx").on(t.slotStartAt),
		check(
			"recommendation_note_slot_order",
			sql`${t.slotStartAt} <= ${t.slotEndAt}`,
		),
	],
);
