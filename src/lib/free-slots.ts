import type { GoogleCalendarEvent } from "@/lib/google-calendar";
import { RECOMMENDATION_CONFIG } from "@/lib/recommendation-config";

export type FreeSlot = {
	startIso: string;
	endIso: string;
	durationMinutes: number;
	nextEventId: string | null;
};

type Interval = { startMs: number; endMs: number; eventId?: string };

function clampInterval(
	interval: Interval,
	minMs: number,
	maxMs: number,
): Interval | null {
	const startMs = Math.max(interval.startMs, minMs);
	const endMs = Math.min(interval.endMs, maxMs);
	if (endMs <= startMs) return null;
	return { ...interval, startMs, endMs };
}

function mergeIntervals(intervals: Interval[]): Interval[] {
	if (intervals.length === 0) return [];
	const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
	const merged: Interval[] = [];
	const first = sorted[0];
	if (!first) return [];
	let cur = first;
	for (let i = 1; i < sorted.length; i += 1) {
		const next = sorted[i];
		if (!next) continue;
		if (next.startMs <= cur.endMs) {
			cur = { ...cur, endMs: Math.max(cur.endMs, next.endMs) };
		} else {
			merged.push(cur);
			cur = next;
		}
	}
	merged.push(cur);
	return merged;
}

function dayBoundMs(date: Date, hour: number) {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
		hour,
		0,
		0,
		0,
	).getTime();
}

export function computeFreeSlotsForDay(
	date: Date,
	events: GoogleCalendarEvent[],
	config: {
		dayStartHour?: number;
		dayEndHour?: number;
		eventBufferMinutes?: number;
		minSlotMinutes?: number;
	} = {},
): FreeSlot[] {
	const dayStartHour =
		config.dayStartHour ?? RECOMMENDATION_CONFIG.DAY_START_HOUR;
	const dayEndHour = config.dayEndHour ?? RECOMMENDATION_CONFIG.DAY_END_HOUR;
	const eventBufferMinutes =
		config.eventBufferMinutes ?? RECOMMENDATION_CONFIG.EVENT_BUFFER_MINUTES;
	const minSlotMinutes = config.minSlotMinutes ?? 0;

	const windowStartMs = dayBoundMs(date, dayStartHour);
	const windowEndMs = dayBoundMs(date, dayEndHour);
	if (windowEndMs <= windowStartMs) return [];

	const bufferMs = eventBufferMinutes * 60_000;
	const busy: Interval[] = [];

	for (const e of events) {
		const startMs = new Date(e.startIso).getTime() - bufferMs;
		const endMs = new Date(e.endIso).getTime() + bufferMs;
		const clamped = clampInterval(
			{ startMs, endMs, eventId: e.id },
			windowStartMs,
			windowEndMs,
		);
		if (clamped) busy.push(clamped);
	}

	const mergedBusy = mergeIntervals(busy);
	const free: FreeSlot[] = [];

	const minSlotMs = minSlotMinutes * 60_000;
	let cursorMs = windowStartMs;

	for (const b of mergedBusy) {
		if (b.startMs > cursorMs) {
			const startMs = cursorMs;
			const endMs = b.startMs;
			if (endMs - startMs >= minSlotMs) {
				free.push({
					startIso: new Date(startMs).toISOString(),
					endIso: new Date(endMs).toISOString(),
					durationMinutes: Math.round((endMs - startMs) / 60_000),
					nextEventId: b.eventId ?? null,
				});
			}
		}
		cursorMs = Math.max(cursorMs, b.endMs);
	}

	if (cursorMs < windowEndMs && windowEndMs - cursorMs >= minSlotMs) {
		free.push({
			startIso: new Date(cursorMs).toISOString(),
			endIso: new Date(windowEndMs).toISOString(),
			durationMinutes: Math.round((windowEndMs - cursorMs) / 60_000),
			nextEventId: null,
		});
	}

	return free;
}
