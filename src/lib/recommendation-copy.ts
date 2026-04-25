export type RecommendationCopyInput = {
	activityTitle: string;
	slotMinutes: number;
	hasLocationContext: boolean;
};

export type RecommendationCopyOutput = {
	catchyText: string;
	source: "mock_llm" | "template";
};

function templateCopy(input: RecommendationCopyInput): string {
	if (input.slotMinutes >= 90)
		return `Block out time for: ${input.activityTitle}`;
	if (input.slotMinutes >= 45)
		return `A great fit for this break: ${input.activityTitle}`;
	if (input.hasLocationContext)
		return `Close by and doable now: ${input.activityTitle}`;
	return `Quick win: ${input.activityTitle}`;
}

/**
 * MVP: mock LLM generation. Keeps an integration seam without introducing a provider dependency.
 */
export async function generateCatchyRecommendationCopy(
	input: RecommendationCopyInput,
): Promise<RecommendationCopyOutput> {
	// "Mock LLM" behavior: small variation to feel alive in demos.
	const variants = [
		`Make this break count: ${input.activityTitle}`,
		`Your next mini-adventure: ${input.activityTitle}`,
		`A good use of this pocket of time: ${input.activityTitle}`,
	];
	const idx =
		Math.abs(hashString(`${input.activityTitle}:${input.slotMinutes}`)) %
		variants.length;
	return {
		catchyText: variants[idx] ?? templateCopy(input),
		source: "mock_llm",
	};
}

function hashString(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i += 1) {
		h = (h * 31 + s.charCodeAt(i)) | 0;
	}
	return h;
}
