"use client";

import { useEffect, useMemo, useState } from "react";

import {
	generateReliveSummary,
	type ReliveInteraction,
} from "@/lib/relive-summary";

function formatTime(iso: string) {
	return new Intl.DateTimeFormat(undefined, {
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(iso));
}

function formatDayHeading(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
	}).format(date);
}

function metersToLabel(meters: number | null) {
	if (meters == null) return null;
	if (meters < 950) return `${Math.round(meters / 10) * 10}m`;
	return `${(meters / 1000).toFixed(1)}km`;
}

function seededInteractions(now: Date): ReliveInteraction[] {
	const base = new Date(now);
	base.setMinutes(base.getMinutes() - 180);
	const t1 = new Date(base);
	const t2 = new Date(base);
	t2.setMinutes(t2.getMinutes() + 62);
	const t3 = new Date(base);
	t3.setMinutes(t3.getMinutes() + 118);

	return [
		{
			id: "demo_1",
			activityTitle: "Libe Slope: lie down + sky shot",
			note: "Did a quick walk to reset before the next meeting. Felt calmer afterward.",
			createdAtIso: t1.toISOString(),
			slotStartIso: t1.toISOString(),
			slotEndIso: new Date(t1.getTime() + 20 * 60_000).toISOString(),
			distanceMeters: 240,
			locationLabel: "Libe Slope",
		},
		{
			id: "demo_2",
			activityTitle: "Quick journal reflection",
			note: "Wrote 3 bullets: what happened, how I felt, what I learned. Noticed I rush transitions.",
			createdAtIso: t2.toISOString(),
			slotStartIso: t2.toISOString(),
			slotEndIso: new Date(t2.getTime() + 15 * 60_000).toISOString(),
			distanceMeters: null,
			locationLabel: "Olin / Uris Library",
		},
		{
			id: "demo_3",
			activityTitle: "45-minute deep work sprint",
			note: "Set a timer and finished the hardest part first. Focus felt surprisingly easy today.",
			createdAtIso: t3.toISOString(),
			slotStartIso: t3.toISOString(),
			slotEndIso: new Date(t3.getTime() + 60 * 60_000).toISOString(),
			distanceMeters: null,
			locationLabel: "Gates Hall (Engineering Quad)",
		},
	];
}

export function ReliveClient() {
	const now = useMemo(() => new Date(), []);
	const [loading, setLoading] = useState(true);
	const [interactions] = useState<ReliveInteraction[]>(() =>
		seededInteractions(now),
	);
	const [summary, setSummary] = useState<{
		headline: string;
		bullets: string[];
		tone: string;
	} | null>(null);

	useEffect(() => {
		let alive = true;
		async function run() {
			// Simulated latency for demo feel.
			await new Promise((r) => setTimeout(r, 650));
			const s = await generateReliveSummary(interactions);
			if (!alive) return;
			setSummary({ headline: s.headline, bullets: s.bullets, tone: s.tone });
			setLoading(false);
		}
		void run();
		return () => {
			alive = false;
		};
	}, [interactions]);

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-2">
				<p className="text-sm text-zinc-600">{formatDayHeading(now)}</p>
				<h1 className="text-balance font-semibold text-2xl tracking-tight">
					Relive
				</h1>
				<p className="text-sm text-zinc-600">
					A recap of what you chose to do with your free time.
				</p>
			</header>

			<section className="rounded-xl border border-zinc-200 bg-white p-5 transition duration-300 ease-out">
				{loading ? (
					<div className="flex flex-col gap-3">
						<div className="h-5 w-2/3 animate-pulse rounded bg-zinc-100" />
						<div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
						<div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100" />
						<div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
					</div>
				) : summary ? (
					<div className="flex flex-col gap-3">
						<div className="flex items-center justify-between gap-3">
							<p className="font-medium">{summary.headline}</p>
							<span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
								AI Summary · {summary.tone}
							</span>
						</div>
						<ul className="list-disc pl-5 text-sm text-zinc-700">
							{summary.bullets.map((b) => (
								<li key={b}>{b}</li>
							))}
						</ul>
					</div>
				) : (
					<p className="text-sm text-zinc-600">No summary yet.</p>
				)}
			</section>

			<section className="flex flex-col gap-3">
				<div className="flex items-end justify-between gap-3">
					<h2 className="font-semibold text-lg tracking-tight">Your moments</h2>
				</div>

				<div className="flex flex-col gap-2">
					{interactions.map((i, idx) => {
						const distance = metersToLabel(i.distanceMeters);
						return (
							<article
								className="group rounded-xl border border-zinc-200 bg-white p-4 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-sm"
								key={i.id}
								style={{
									transitionDelay: `${idx * 40}ms`,
								}}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex flex-col gap-1">
										<p className="font-medium">{i.activityTitle}</p>
										<p className="text-sm text-zinc-600">
											{formatTime(i.slotStartIso)}–{formatTime(i.slotEndIso)}
											{distance ? ` · ${distance} away` : ""}
										</p>
									</div>
									<span className="rounded-md bg-zinc-900 px-2 py-1 text-white text-xs opacity-90 transition group-hover:opacity-100">
										Noted
									</span>
								</div>

								<p className="mt-3 text-sm text-zinc-700">{i.note}</p>

								<div className="mt-3 flex items-center justify-between gap-3">
									<p className="text-xs text-zinc-500">
										Captured at {formatTime(i.createdAtIso)}
									</p>
									<p className="text-xs text-zinc-500">
										{i.locationLabel ? i.locationLabel : "Anywhere"}
									</p>
								</div>
							</article>
						);
					})}
				</div>
			</section>
		</div>
	);
}
