"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { api } from "@/trpc/react";

function formatTimeRange(startIso: string, endIso: string) {
	const start = new Date(startIso);
	const end = new Date(endIso);
	const fmt = new Intl.DateTimeFormat(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
	return `${fmt.format(start)}–${fmt.format(end)}`;
}

function metersToLabel(meters: number | null) {
	if (meters == null) return null;
	if (meters < 950) return `${Math.round(meters / 10) * 10}m`;
	return `${(meters / 1000).toFixed(1)}km`;
}

type NoteDraftKey = `${string}|${string}|${string}`; // activityPublicId|slotStartIso|slotEndIso

export function TodayRecommendations() {
	const [geo, setGeo] = useState<{
		latitude: number;
		longitude: number;
	} | null>(null);
	const [geoStatus, setGeoStatus] = useState<
		"idle" | "requesting" | "granted" | "denied" | "unavailable"
	>("idle");
	const [activeNoteKey, setActiveNoteKey] = useState<NoteDraftKey | null>(null);
	const [noteDrafts, setNoteDrafts] = useState<Record<NoteDraftKey, string>>(
		{},
	);
	const [savedToast, setSavedToast] = useState<string | null>(null);

	const getForToday = api.recommendations.getForToday.useQuery(
		{
			latitude: geo?.latitude,
			longitude: geo?.longitude,
		},
		{
			staleTime: 30_000,
		},
	);

	const saveNote = api.recommendations.saveNote.useMutation({
		onSuccess: () => {
			setSavedToast("Saved to your timeline.");
			setTimeout(() => setSavedToast(null), 2500);
		},
	});

	const requestLocation = useCallback(() => {
		if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
			setGeoStatus("unavailable");
			if (process.env.NODE_ENV === "development") {
				console.debug("[geo] geolocation unavailable in this environment");
			}
			return;
		}

		setGeoStatus("requesting");
		if (process.env.NODE_ENV === "development") {
			console.debug("[geo] requesting browser geolocation");
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				setGeo({
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
				});
				setGeoStatus("granted");
				if (process.env.NODE_ENV === "development") {
					console.debug("[geo] granted", {
						latitude: pos.coords.latitude,
						longitude: pos.coords.longitude,
						accuracyMeters: pos.coords.accuracy,
					});
				}
			},
			(err) => {
				setGeo(null);
				setGeoStatus("denied");
				if (process.env.NODE_ENV === "development") {
					console.debug("[geo] denied", {
						code: err.code,
						message: err.message,
					});
				}
			},
			{ enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
		);
	}, []);

	useEffect(() => {
		requestLocation();
	}, [requestLocation]);

	const slots = useMemo(() => {
		if (!getForToday.data?.ok) return [];
		return getForToday.data.freeSlots;
	}, [getForToday.data]);

	return (
		<section className="flex flex-col gap-3">
			<header className="flex items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<h2 className="font-semibold text-lg tracking-tight">
						Recommended for your free time
					</h2>
					<p className="text-sm text-zinc-600">
						We look for gaps between 9AM and 9PM (with a 15-minute buffer).
					</p>
				</div>

				<button
					className="shrink-0 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm transition hover:bg-zinc-50"
					onClick={requestLocation}
					type="button"
				>
					{geoStatus === "requesting"
						? "Locating…"
						: geoStatus === "granted"
							? "Refresh location"
							: "Enable location"}
				</button>
			</header>

			{savedToast ? (
				<div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 transition">
					{savedToast}
				</div>
			) : null}

			{getForToday.isLoading ? (
				<div className="rounded-lg border border-zinc-200 bg-white p-4">
					<div className="flex flex-col gap-3">
						<div className="h-4 w-48 animate-pulse rounded bg-zinc-100" />
						<div className="h-10 animate-pulse rounded bg-zinc-100" />
						<div className="h-10 animate-pulse rounded bg-zinc-100" />
					</div>
				</div>
			) : getForToday.isError ? (
				<div className="rounded-lg border border-zinc-200 bg-white p-4">
					<p className="font-medium">Couldn’t load recommendations</p>
					<p className="mt-1 text-sm text-zinc-600">
						{getForToday.error.message}
					</p>
				</div>
			) : getForToday.data && !getForToday.data.ok ? (
				<div className="rounded-lg border border-zinc-200 bg-white p-4">
					<p className="font-medium">Calendar not connected</p>
					<p className="mt-1 text-sm text-zinc-600">
						Connect Google Calendar to continue.
					</p>
				</div>
			) : slots.length === 0 ? (
				<div className="rounded-lg border border-zinc-200 bg-white p-4">
					<p className="font-medium">No free slots found</p>
					<p className="mt-1 text-sm text-zinc-600">
						Your day looks packed (or outside the 9AM–9PM window).
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-3">
					{slots.map((s) => (
						<article
							className="rounded-lg border border-zinc-200 bg-white p-4 transition duration-200 ease-out"
							key={`${s.slot.startIso}-${s.slot.endIso}`}
						>
							<div className="flex items-start justify-between gap-3">
								<div className="flex flex-col gap-1">
									<p className="font-medium">
										Free {formatTimeRange(s.slot.startIso, s.slot.endIso)}
									</p>
									<p className="text-sm text-zinc-600">
										{s.slot.durationMinutes} min
										{geoStatus === "denied"
											? " · location denied (showing general picks)"
											: geoStatus === "unavailable"
												? " · location unavailable (showing general picks)"
												: ""}
									</p>
								</div>
							</div>

							{s.recommendations.length === 0 ? (
								<p className="mt-3 text-sm text-zinc-600">
									No good match yet for this slot.
								</p>
							) : (
								<div className="mt-3 grid gap-2">
									{s.recommendations.map((r) => {
										const noteKey: NoteDraftKey = `${r.activityPublicId}|${s.slot.startIso}|${s.slot.endIso}`;
										const isActive = activeNoteKey === noteKey;
										const distanceLabel = metersToLabel(r.distanceMeters);

										return (
											<div
												className="rounded-md border border-zinc-200 bg-white p-3 transition hover:border-zinc-300 hover:bg-zinc-50"
												key={noteKey}
											>
												<div className="flex items-start justify-between gap-3">
													<div className="flex flex-col gap-1">
														<p className="font-medium">{r.title}</p>
														<p className="text-sm text-zinc-600">
															{(r as { catchyText?: string }).catchyText ?? ""}
															{distanceLabel ? ` · ${distanceLabel} away` : ""}
														</p>
													</div>

													<button
														className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-sm text-white transition hover:bg-zinc-800"
														onClick={() =>
															setActiveNoteKey((cur) =>
																cur === noteKey ? null : noteKey,
															)
														}
														type="button"
													>
														{isActive ? "Close" : "Add note"}
													</button>
												</div>

												{isActive ? (
													<div className="mt-3 flex flex-col gap-2">
														<label
															className="text-sm text-zinc-600"
															htmlFor={`note-${noteKey}`}
														>
															What did you do / reflect on?
														</label>
														<textarea
															className="min-h-20 w-full resize-y rounded-md border border-zinc-200 bg-white p-2 text-sm outline-none transition focus:border-zinc-400"
															id={`note-${noteKey}`}
															onChange={(e) =>
																setNoteDrafts((prev) => ({
																	...prev,
																	[noteKey]: e.target.value,
																}))
															}
															placeholder="e.g. Tried a 10-minute walk to reset before the next meeting…"
															value={noteDrafts[noteKey] ?? ""}
														/>
														<div className="flex items-center justify-between gap-3">
															<p className="text-xs text-zinc-500">
																This will appear in your timeline later.
															</p>
															<button
																className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
																disabled={
																	saveNote.isPending ||
																	(noteDrafts[noteKey] ?? "").trim().length ===
																		0
																}
																onClick={() =>
																	saveNote.mutate({
																		activityPublicId: r.activityPublicId,
																		slotStartIso: s.slot.startIso,
																		slotEndIso: s.slot.endIso,
																		note: (noteDrafts[noteKey] ?? "").trim(),
																	})
																}
																type="button"
															>
																{saveNote.isPending ? "Saving…" : "Save note"}
															</button>
														</div>
													</div>
												) : null}
											</div>
										);
									})}
								</div>
							)}
						</article>
					))}
				</div>
			)}
		</section>
	);
}
