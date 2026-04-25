export type ReliveInteraction = {
	id: string;
	activityTitle: string;
	note: string;
	createdAtIso: string;
	slotStartIso: string;
	slotEndIso: string;
	distanceMeters: number | null;
	locationLabel: string | null;
};

export type ReliveSummary = {
	headline: string;
	bullets: string[];
	tone: "calm" | "energized" | "reflective";
	source: "llm" | "fallback";
};

export async function generateReliveSummary(
	interactions: ReliveInteraction[],
): Promise<ReliveSummary> {
	const res = await fetch("/api/relive/summary", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ interactions }),
	});

	const json = (await res.json().catch(() => null)) as {
		ok?: boolean;
		summary?: {
			headline?: string;
			bullets?: string[];
			tone?: ReliveSummary["tone"];
		};
		source?: ReliveSummary["source"];
	} | null;

	const summary = json?.summary;
	if (!json?.ok || !summary?.headline || !summary?.bullets || !summary?.tone) {
		return {
			headline: "A quick recap of your day so far",
			bullets: [
				"You’re building a habit of turning free time into intentional moments.",
			],
			tone: "reflective",
			source: "fallback",
		};
	}

	return {
		headline: summary.headline,
		bullets: summary.bullets,
		tone: summary.tone,
		source: json.source ?? "fallback",
	};
}
