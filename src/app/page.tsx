import Link from "next/link";
import { fetchTodaysGoogleCalendarEvents } from "@/lib/google-calendar";
import type { DayTimeline } from "@/lib/timeline";

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
		<main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
			<header className="flex flex-col gap-1">
				<h1 className="text-balance font-semibold text-2xl tracking-tight">
					Today
				</h1>
				<p className="text-muted-foreground text-sm">{formatDayHeading(day)}</p>
			</header>

			{!result.ok ? (
				<section className="rounded-lg border border-border bg-card p-4">
					<p className="font-medium">Calendar not connected</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Connect Google Calendar in Clerk to see your events here.
					</p>
					{result.reason === "no_google_token" ? (
						<div className="mt-4">
							<Link
								className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground text-sm hover:opacity-90"
								href="/settings"
							>
								Connect Google Calendar
							</Link>
						</div>
					) : null}
				</section>
			) : !timeline || timeline.events.length === 0 ? (
				<section className="rounded-lg border border-border bg-card p-4">
					<p className="font-medium">No events today</p>
					<p className="mt-1 text-muted-foreground text-sm">
						Your calendar looks free for now.
					</p>
				</section>
			) : (
				<section className="flex flex-col gap-3">
					{timeline.events.map((e) => (
						<article
							className="rounded-lg border border-border bg-card p-4"
							key={e.id}
						>
							<div className="flex flex-col gap-1">
								<div className="flex items-start justify-between gap-3">
									<h2 className="font-medium">{e.title}</h2>
									{e.link ? (
										<a
											className="shrink-0 text-primary text-sm underline-offset-4 hover:underline"
											href={e.link}
											rel="noreferrer"
											target="_blank"
										>
											Open
										</a>
									) : null}
								</div>
								<p className="text-muted-foreground text-sm">
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
		</main>
	);
}
