import { z } from "zod";

export const activitySourceTypeSchema = z.enum(["curated", "user"]);
export type ActivitySourceType = z.infer<typeof activitySourceTypeSchema>;

export const activityDaysSchema = z.enum(["weekday", "weekend", "any"]);
export type ActivityDays = z.infer<typeof activityDaysSchema>;

export const activityTimeOfDaySchema = z.enum([
	"early-morning",
	"morning",
	"late-morning",
	"afternoon",
	"evening",
	"night",
	"late-night",
]);
export type ActivityTimeOfDay = z.infer<typeof activityTimeOfDaySchema>;

export const activityCategorySchema = z.enum([
	"food",
	"nature",
	"entertainment",
	"social",
]);
export type ActivityCategory = z.infer<typeof activityCategorySchema>;
