import "server-only";

import { env } from "@/env";

export type GeocodeResult =
	| { ok: true; latitude: number; longitude: number; formattedAddress: string }
	| { ok: false; reason: "no_api_key" | "zero_results" | "error" };

type CacheEntry = { value: GeocodeResult; expiresAtMs: number };

const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h
const cache = new Map<string, CacheEntry>();

function debugLog(message: string, data?: Record<string, unknown>) {
	if (env.NODE_ENV !== "development") return;
	console.debug(`[geocode] ${message}`, data ?? {});
}

function normalizeQuery(q: string) {
	return q.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
	const apiKey = env.GOOGLE_MAPS_API_KEY;
	if (!apiKey) {
		debugLog("no API key configured");
		return { ok: false, reason: "no_api_key" };
	}

	const query = normalizeQuery(address);
	if (query.length === 0) {
		debugLog("empty query");
		return { ok: false, reason: "zero_results" };
	}

	const now = Date.now();
	const cached = cache.get(query);
	if (cached && cached.expiresAtMs > now) {
		debugLog("cache hit", { query });
		return cached.value;
	}

	const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
	url.searchParams.set("address", address);
	url.searchParams.set("key", apiKey);

	try {
		debugLog("request", { address });
		const res = await fetch(url.toString());
		const json = (await res.json().catch(() => null)) as {
			status?: string;
			results?: Array<{
				formatted_address?: string;
				geometry?: { location?: { lat?: number; lng?: number } };
			}>;
		} | null;

		const status = json?.status ?? null;
		const first = json?.results?.[0] ?? null;
		const loc = first?.geometry?.location ?? null;

		if (
			status === "ZERO_RESULTS" ||
			!first ||
			loc?.lat == null ||
			loc?.lng == null
		) {
			debugLog("zero results", { address, status });
			const value: GeocodeResult = { ok: false, reason: "zero_results" };
			cache.set(query, { value, expiresAtMs: now + CACHE_TTL_MS });
			return value;
		}

		if (!res.ok || status !== "OK") {
			debugLog("error response", { address, status, httpStatus: res.status });
			const value: GeocodeResult = { ok: false, reason: "error" };
			cache.set(query, { value, expiresAtMs: now + 60_000 });
			return value;
		}

		debugLog("success", { address, latitude: loc.lat, longitude: loc.lng });
		const value: GeocodeResult = {
			ok: true,
			latitude: loc.lat,
			longitude: loc.lng,
			formattedAddress: first.formatted_address ?? address,
		};
		cache.set(query, { value, expiresAtMs: now + CACHE_TTL_MS });
		return value;
	} catch {
		debugLog("network/exception", { address });
		const value: GeocodeResult = { ok: false, reason: "error" };
		cache.set(query, { value, expiresAtMs: now + 60_000 });
		return value;
	}
}
