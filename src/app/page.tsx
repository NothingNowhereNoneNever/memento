import Link from "next/link";
import { TodayRecommendations } from "@/components/app-ui/today-recommendations";
import { fetchTodaysGoogleCalendarEvents } from "@/lib/google-calendar";
import type { DayTimeline } from "@/lib/timeline";
import { ensureCurrentUser } from "@/server/auth/ensure-user";

function formatDayHeading(date: Date) {
	return new Intl.DateTimeFormat(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
	}).format(date);
}

function formatTimeRange(startIso: string, endIso: string) {
	const start = new Date(startIso);
	const end = new Date(endIso);
	const fmt = new Intl.DateTimeFormat(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
	return `${fmt.format(start)}–${fmt.format(end)}`;
}

export default async function HomePage() {
	await ensureCurrentUser().catch((error: unknown) => {
		console.error("Failed to upsert current user", error);
	});

	const day = new Date();
	const result = await fetchTodaysGoogleCalendarEvents();

	let timeline: DayTimeline | null = null;
	if (result.ok) {
		timeline = {
			dayIso: day.toISOString(),
			events: result.events.map((e) => ({
				id: e.id,
				title: e.summary ?? "(No title)",
				startIso: e.startIso,
				endIso: e.endIso,
				isAllDay: e.isAllDay,
				location: e.location,
				link: e.htmlLink,
			})),
		};
	}

	return (
		<main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col gap-6 px-4 py-10">
			<header className="flex flex-col gap-1">
				<h1 className="text-balance font-semibold text-2xl tracking-tight">
					Today
				</h1>
				<p className="text-sm text-zinc-600">{formatDayHeading(day)}</p>
			</header>

			{!result.ok ? (
				<section className="rounded-lg border border-zinc-200 bg-white p-4">
					<p className="font-medium">Calendar not connected</p>
					<p className="mt-1 text-sm text-zinc-600">
						{result.reason === "google_insufficient_scope"
							? "Google Calendar needs additional permissions. Reconnect it in Clerk settings and approve Calendar access."
							: result.reason === "google_api_error"
								? "Google Calendar needs re-authorization. Reconnect it in Clerk settings to continue."
								: "Connect Google Calendar in Clerk to see your events here."}
					</p>
					<div className="mt-4">
						<Link
							className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-3 py-2 font-medium text-sm text-white hover:bg-zinc-800"
							href="/settings"
						>
							Connect Google Calendar
						</Link>
					</div>
				</section>
			) : !timeline || timeline.events.length === 0 ? (
				<section className="rounded-lg border border-zinc-200 bg-white p-4">
					<p className="font-medium">No events today</p>
					<p className="mt-1 text-sm text-zinc-600">
						Your calendar looks free for now.
					</p>
				</section>
			) : (
				<section className="flex flex-col gap-3">
					{timeline.events.map((e) => (
						<article
							className="rounded-lg border border-zinc-200 bg-white p-4"
							key={e.id}
						>
							<div className="flex flex-col gap-1">
								<div className="flex items-start justify-between gap-3">
									<h2 className="font-medium">{e.title}</h2>
									{e.link ? (
										<a
											className="shrink-0 text-sm text-zinc-900 underline-offset-4 hover:underline"
											href={e.link}
											rel="noreferrer"
											target="_blank"
										>
											Open
										</a>
									) : null}
								</div>
								<p className="text-sm text-zinc-600">
									{e.isAllDay
										? "All day"
										: formatTimeRange(e.startIso, e.endIso)}
									{e.location ? ` · ${e.location}` : ""}
								</p>
							</div>
						</article>
					))}
				</section>
			)}

			<TodayRecommendations />
		</main>
	);
}
