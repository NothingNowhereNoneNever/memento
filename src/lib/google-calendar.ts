import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";

export type GoogleCalendarEvent = {
	id: string;
	summary: string | null;
	startIso: string;
	endIso: string;
	isAllDay: boolean;
	location: string | null;
	htmlLink: string | null;
};

function startOfDay(date: Date) {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
		0,
		0,
		0,
		0,
	);
}

function endOfDay(date: Date) {
	return new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
		23,
		59,
		59,
		999,
	);
}

type GoogleTokenFailureReason = "not_signed_in" | "no_google_token";

type GoogleTokenResult =
	| { ok: true; token: string }
	| { ok: false; reason: GoogleTokenFailureReason };

export async function getGoogleAccessTokenForCurrentUser(): Promise<GoogleTokenResult> {
	const { userId } = await auth();
	if (!userId) return { ok: false, reason: "not_signed_in" };

	const client = await clerkClient();
	const tokens = await client.users.getUserOauthAccessToken(
		userId,
		"oauth_google",
	);

	const token = tokens.data[0]?.token;
	if (!token) return { ok: false, reason: "no_google_token" };

	return { ok: true, token };
}

type GoogleCalendarResult =
	| { ok: true; events: GoogleCalendarEvent[] }
	| { ok: false; reason: GoogleTokenFailureReason | "google_api_error" };

export async function fetchTodaysGoogleCalendarEvents(): Promise<GoogleCalendarResult> {
	const tokenResult = await getGoogleAccessTokenForCurrentUser();
	if (!tokenResult.ok) return { ok: false, reason: tokenResult.reason };

	const now = new Date();
	const timeMin = startOfDay(now).toISOString();
	const timeMax = endOfDay(now).toISOString();

	const url = new URL(
		"https://www.googleapis.com/calendar/v3/calendars/primary/events",
	);
	url.searchParams.set("timeMin", timeMin);
	url.searchParams.set("timeMax", timeMax);
	url.searchParams.set("singleEvents", "true");
	url.searchParams.set("orderBy", "startTime");

	const res = await fetch(url.toString(), {
		headers: {
			Authorization: `Bearer ${tokenResult.token}`,
		},
	});

	if (!res.ok) {
		return { ok: false, reason: "google_api_error" };
	}

	const json: unknown = await res.json();
	const items = (json as { items?: unknown[] } | null)?.items ?? [];

	const events: GoogleCalendarEvent[] = [];
	for (const item of items) {
		const e = item as {
			id?: unknown;
			summary?: unknown;
			location?: unknown;
			htmlLink?: unknown;
			start?: { dateTime?: unknown; date?: unknown };
			end?: { dateTime?: unknown; date?: unknown };
		};

		if (typeof e.id !== "string") continue;

		const startDateTime =
			typeof e.start?.dateTime === "string"
				? e.start.dateTime
				: typeof e.start?.date === "string"
					? `${e.start.date}T00:00:00.000Z`
					: null;

		const endDateTime =
			typeof e.end?.dateTime === "string"
				? e.end.dateTime
				: typeof e.end?.date === "string"
					? `${e.end.date}T00:00:00.000Z`
					: null;

		if (!startDateTime || !endDateTime) continue;

		events.push({
			id: e.id,
			summary: typeof e.summary === "string" ? e.summary : null,
			startIso: new Date(startDateTime).toISOString(),
			endIso: new Date(endDateTime).toISOString(),
			isAllDay: typeof e.start?.date === "string",
			location: typeof e.location === "string" ? e.location : null,
			htmlLink: typeof e.htmlLink === "string" ? e.htmlLink : null,
		});
	}

	return { ok: true, events };
}
