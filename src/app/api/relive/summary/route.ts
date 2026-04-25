import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { env } from "@/env";

const interactionSchema = z.object({
	id: z.string(),
	activityTitle: z.string(),
	note: z.string(),
	createdAtIso: z.string(),
	slotStartIso: z.string(),
	slotEndIso: z.string(),
	distanceMeters: z.number().nullable(),
	locationLabel: z.string().nullable(),
});

const bodySchema = z.object({
	interactions: z.array(interactionSchema).min(1).max(50),
});

function fallbackSummary(
	interactions: Array<z.infer<typeof interactionSchema>>,
) {
	const notes = interactions.map((i) => i.note.toLowerCase());
	const bullets: string[] = [];
	if (notes.some((n) => n.includes("walk") || n.includes("reset"))) {
		bullets.push("You use short movement breaks to reset between commitments.");
	}
	if (notes.some((n) => n.includes("journal") || n.includes("reflect"))) {
		bullets.push(
			"Reflection helps you notice patterns and slow down transitions.",
		);
	}
	if (notes.some((n) => n.includes("focus") || n.includes("deep work"))) {
		bullets.push("You’re effective with short, bounded focus sprints.");
	}
	if (bullets.length === 0) {
		bullets.push(
			"You’re building a habit of turning free time into intentional moments.",
		);
	}
	return {
		headline: "A quick recap of your day so far",
		bullets: bullets.slice(0, 3),
		tone: "reflective" as const,
	};
}

async function summarizeWithAnthropic(
	interactions: Array<z.infer<typeof interactionSchema>>,
) {
	if (!env.ANTHROPIC_API_KEY) return null;
	const model = env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";

	const res = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"x-api-key": env.ANTHROPIC_API_KEY,
			"anthropic-version": "2023-06-01",
			"content-type": "application/json",
		},
		body: JSON.stringify({
			model,
			max_tokens: 400,
			temperature: 0.7,
			system:
				"Return strictly valid JSON. No markdown. No backticks. No extra keys. Only: headline (string), bullets (string[] length 2-4), tone (calm|energized|reflective). Do not invent facts beyond the provided notes/titles/timestamps.",
			messages: [
				{
					role: "user",
					content: [
						"You are a warm, concise journaling assistant.",
						"Summarize the user's past interactions with suggested activities.",
						"Return JSON only.",
						"",
						"Interactions JSON:",
						JSON.stringify(interactions),
					].join("\n"),
				},
			],
		}),
	});

	if (!res.ok) return null;
	const json = (await res.json().catch(() => null)) as {
		content?: Array<{ type?: string; text?: string }>;
	} | null;

	const text = json?.content?.find((c) => c.type === "text")?.text ?? null;
	if (!text) return null;

	try {
		const parsed = JSON.parse(text) as {
			headline?: unknown;
			bullets?: unknown;
			tone?: unknown;
		};
		if (typeof parsed.headline !== "string") return null;
		if (
			!Array.isArray(parsed.bullets) ||
			parsed.bullets.some((b) => typeof b !== "string")
		) {
			return null;
		}
		if (
			parsed.tone !== "calm" &&
			parsed.tone !== "energized" &&
			parsed.tone !== "reflective"
		) {
			return null;
		}
		return {
			headline: parsed.headline,
			bullets: parsed.bullets.slice(0, 4),
			tone: parsed.tone,
		};
	} catch {
		return null;
	}
}

export async function POST(req: Request) {
	const body = await req.json().catch(() => null);
	const parsed = bodySchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}

	const interactions = parsed.data.interactions;
	const llm = await summarizeWithAnthropic(interactions);

	return NextResponse.json({
		ok: true,
		summary: llm ?? fallbackSummary(interactions),
		source: llm ? "llm" : "fallback",
	});
}
