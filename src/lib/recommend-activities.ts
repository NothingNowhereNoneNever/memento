import type {
	ActivityCategory,
	ActivityDays,
	ActivityTimeOfDay,
} from "@/lib/activity";
import type { FreeSlot } from "@/lib/free-slots";
import type { activities } from "@/server/db/schema";

export type ActivityRow = typeof activities.$inferSelect;

export type GeoPoint = { latitude: number; longitude: number };

export type SlotRecommendation = {
	activityPublicId: string;
	title: string;
	description: string | null;
	category: ActivityCategory;
	score: number;
	distanceMeters: number | null;
};

export type SlotWithRecommendations = {
	slot: FreeSlot;
	recommendations: SlotRecommendation[];
};

function haversineMeters(a: GeoPoint, b: GeoPoint): number {
	const R = 6_371_000;
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(b.latitude - a.latitude);
	const dLon = toRad(b.longitude - a.longitude);
	const lat1 = toRad(a.latitude);
	const lat2 = toRad(b.latitude);
	const sin1 = Math.sin(dLat / 2);
	const sin2 = Math.sin(dLon / 2);
	const h = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
	return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function isWeekend(date: Date) {
	const day = date.getDay(); // 0 Sun .. 6 Sat
	return day === 0 || day === 6;
}

function slotDayBucket(date: Date): ActivityDays {
	return isWeekend(date) ? "weekend" : "weekday";
}

function slotTimeOfDay(date: Date): ActivityTimeOfDay {
	const h = date.getHours();
	if (h < 7) return "early-morning";
	if (h < 10) return "morning";
	if (h < 12) return "late-morning";
	if (h < 17) return "afternoon";
	if (h < 20) return "evening";
	if (h < 22) return "night";
	return "late-night";
}

function parseTimeToMinutes(time: string): number | null {
	// Expected: "HH:MM:SS" (Postgres time)
	const m = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
	if (!m) return null;
	const hh = Number(m[1]);
	const mm = Number(m[2]);
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
	return hh * 60 + mm;
}

function slotMinutesOfDay(date: Date) {
	return date.getHours() * 60 + date.getMinutes();
}

function ymdLocal(date: Date) {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const d = String(date.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function matchesSpecificDates(activity: ActivityRow, slotStart: Date) {
	const specificDates = activity.specificDates ?? null;
	if (!specificDates || specificDates.length === 0) return true;
	const slotYmd = ymdLocal(slotStart);
	return specificDates.some((d) => {
		const asDate: Date =
			typeof d === "string" ? new Date(d) : new Date(d as unknown as Date);
		return Number.isFinite(asDate.getTime()) && ymdLocal(asDate) === slotYmd;
	});
}

function matchesDays(activityDays: ActivityDays, slotStart: Date) {
	if (activityDays === "any") return true;
	return activityDays === slotDayBucket(slotStart);
}

function matchesTimeOfDay(activity: ActivityRow, slotStart: Date) {
	if (!activity.timeOfDay) return true;
	return activity.timeOfDay === slotTimeOfDay(slotStart);
}

function matchesExplicitTimeWindow(
	activity: ActivityRow,
	slotStart: Date,
	slotEnd: Date,
) {
	if (!activity.startTime && !activity.endTime) return true;
	if (!activity.startTime || !activity.endTime) return true;

	const activityStart = parseTimeToMinutes(activity.startTime);
	const activityEnd = parseTimeToMinutes(activity.endTime);
	if (activityStart == null || activityEnd == null) return true;

	const slotStartMin = slotMinutesOfDay(slotStart);
	const slotEndMin = slotMinutesOfDay(slotEnd);

	// MVP: only handle windows that don't cross midnight.
	if (slotEndMin <= slotStartMin) return false;
	return slotStartMin >= activityStart && slotEndMin <= activityEnd;
}

function matchesDuration(activity: ActivityRow, slotMinutes: number) {
	if (
		activity.minDurationMinutes != null &&
		slotMinutes < activity.minDurationMinutes
	) {
		return false;
	}
	if (
		activity.maxDurationMinutes != null &&
		slotMinutes > activity.maxDurationMinutes
	) {
		return false;
	}
	return true;
}

function computeDistanceMeters(
	activity: ActivityRow,
	anchors: GeoPoint[],
): number | null {
	if (anchors.length === 0) return null;
	const activityPoint: GeoPoint = {
		latitude: activity.latitude,
		longitude: activity.longitude,
	};
	let best: number | null = null;
	for (const a of anchors) {
		const d = haversineMeters(a, activityPoint);
		best = best == null ? d : Math.min(best, d);
	}
	return best;
}

function matchesLocation(activity: ActivityRow, distanceMeters: number | null) {
	if (activity.radiusMeters == null) return true;
	if (distanceMeters == null) return false;
	return distanceMeters <= activity.radiusMeters;
}

function scoreActivity(
	activity: ActivityRow,
	slotMinutes: number,
	distanceMeters: number | null,
) {
	let score = 0;

	// Priority has a strong effect for demo predictability.
	score += (activity.priority ?? 0) * 100;

	// Prefer tighter duration fits when we have bounds.
	if (
		activity.minDurationMinutes != null ||
		activity.maxDurationMinutes != null
	) {
		const min = activity.minDurationMinutes ?? 0;
		const max = activity.maxDurationMinutes ?? slotMinutes;
		const target = Math.max(min, Math.min(slotMinutes, max));
		score += 50 - Math.abs(slotMinutes - target);
	} else {
		score += 10;
	}

	// Prefer closer when activity has a radius specified.
	if (activity.radiusMeters != null && distanceMeters != null) {
		score += Math.max(0, 50 - Math.round(distanceMeters / 100));
	}

	return score;
}

export function recommendActivitiesForSlots(input: {
	slots: FreeSlot[];
	activities: ActivityRow[];
	anchors: GeoPoint[]; // current location, and optionally other points
	maxPerSlot: number;
}): SlotWithRecommendations[] {
	const { slots, activities, anchors, maxPerSlot } = input;

	return slots.map((slot) => {
		const slotStart = new Date(slot.startIso);
		const slotEnd = new Date(slot.endIso);
		const slotMinutes = Math.max(
			0,
			Math.round((slotEnd.getTime() - slotStart.getTime()) / 60_000),
		);

		const recs: SlotRecommendation[] = [];

		for (const a of activities) {
			if (!a.isActive) continue;
			if (!matchesSpecificDates(a, slotStart)) continue;
			if (!matchesDays(a.days as ActivityDays, slotStart)) continue;
			if (!matchesTimeOfDay(a, slotStart)) continue;
			if (!matchesExplicitTimeWindow(a, slotStart, slotEnd)) continue;
			if (!matchesDuration(a, slotMinutes)) continue;

			const distanceMeters = computeDistanceMeters(a, anchors);
			if (!matchesLocation(a, distanceMeters)) continue;

			recs.push({
				activityPublicId: a.publicId,
				title: a.title,
				description: a.description ?? null,
				category: a.category as ActivityCategory,
				score: scoreActivity(a, slotMinutes, distanceMeters),
				distanceMeters,
			});
		}

		recs.sort((x, y) => {
			if (y.score !== x.score) return y.score - x.score;
			return x.activityPublicId.localeCompare(y.activityPublicId);
		});

		return { slot, recommendations: recs.slice(0, maxPerSlot) };
	});
}
