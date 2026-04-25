import { auth } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { computeFreeSlotsForDay } from "@/lib/free-slots";
import { fetchTodaysGoogleCalendarEvents } from "@/lib/google-calendar";
import { generateId } from "@/lib/id";
import { recommendActivitiesForSlots } from "@/lib/recommend-activities";
import { RECOMMENDATION_CONFIG } from "@/lib/recommendation-config";
import { generateCatchyRecommendationCopy } from "@/lib/recommendation-copy";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { ensureCurrentUser } from "@/server/auth/ensure-user";
import { recommendationNotes } from "@/server/db/schema";
import { geocodeAddress } from "@/server/lib/geocode";

export const recommendationsRouter = createTRPCRouter({
	getForToday: publicProcedure
		.input(
			z.object({
				latitude: z.number().finite().optional(),
				longitude: z.number().finite().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { userId } = await auth();
			if (!userId) {
				throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in" });
			}

			const calendarResult = await fetchTodaysGoogleCalendarEvents();
			if (!calendarResult.ok) {
				return {
					ok: false as const,
					reason: calendarResult.reason,
				};
			}

			const day = new Date();
			const slots = computeFreeSlotsForDay(day, calendarResult.events);

			const activities = await ctx.db.query.activities.findMany({
				where: (a, { eq }) => eq(a.isActive, true),
			});

			const anchors =
				input.latitude != null && input.longitude != null
					? [{ latitude: input.latitude, longitude: input.longitude }]
					: [];

			// Minimal Maps integration: geocode the next event's location string (if any)
			// and add it as an additional anchor point for distance filtering/scoring.
			const candidateLocations = calendarResult.events
				.map((e) => (typeof e.location === "string" ? e.location.trim() : ""))
				.filter((loc) => loc.length > 0);

			if (process.env.NODE_ENV === "development") {
				console.debug(
					"[recs] location candidates",
					candidateLocations.slice(0, 5),
				);
				console.debug("[recs] browser anchor", {
					latitude: input.latitude ?? null,
					longitude: input.longitude ?? null,
				});
			}

			let nextEventGeocode:
				| { ok: true; location: string; latitude: number; longitude: number }
				| {
						ok: false;
						reason: "no_candidate" | "no_api_key" | "zero_results" | "error";
				  } = {
				ok: false,
				reason: "no_candidate",
			};

			for (const loc of candidateLocations.slice(0, 5)) {
				const geo = await geocodeAddress(loc);
				if (geo.ok) {
					anchors.push({ latitude: geo.latitude, longitude: geo.longitude });
					nextEventGeocode = {
						ok: true,
						location: loc,
						latitude: geo.latitude,
						longitude: geo.longitude,
					};
					if (process.env.NODE_ENV === "development") {
						console.debug(
							"[recs] geocoded next-event location",
							nextEventGeocode,
						);
					}
					break;
				}
				nextEventGeocode = { ok: false, reason: geo.reason };
				if (process.env.NODE_ENV === "development") {
					console.debug("[recs] geocode failed", {
						location: loc,
						reason: geo.reason,
					});
				}
				if (geo.reason === "no_api_key") break;
			}

			const slotRecs = recommendActivitiesForSlots({
				slots,
				activities,
				anchors,
				maxPerSlot: RECOMMENDATION_CONFIG.MAX_RECOMMENDATIONS_PER_SLOT,
			});

			const hasLocationContext = anchors.length > 0;

			return {
				ok: true as const,
				dayIso: day.toISOString(),
				debug: {
					anchorCount: anchors.length,
					hasBrowserGeo: input.latitude != null && input.longitude != null,
					nextEventGeocode,
				},
				freeSlots: await Promise.all(
					slotRecs.map(async (r) => ({
						slot: r.slot,
						recommendations: await Promise.all(
							r.recommendations.map(async (rec) => {
								const copy = await generateCatchyRecommendationCopy({
									activityTitle: rec.title,
									slotMinutes: r.slot.durationMinutes,
									hasLocationContext,
								});
								return {
									...rec,
									catchyText: copy.catchyText,
									catchyTextSource: copy.source,
								};
							}),
						),
					})),
				),
			};
		}),

	saveNote: publicProcedure
		.input(
			z.object({
				activityPublicId: z.string().min(1),
				slotStartIso: z.string().min(1),
				slotEndIso: z.string().min(1),
				note: z.string().min(1).max(4000),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { userId } = await auth();
			if (!userId) {
				throw new TRPCError({ code: "UNAUTHORIZED", message: "Not signed in" });
			}

			const slotStartAt = new Date(input.slotStartIso);
			const slotEndAt = new Date(input.slotEndIso);
			if (
				!Number.isFinite(slotStartAt.getTime()) ||
				!Number.isFinite(slotEndAt.getTime())
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invalid slot timestamps",
				});
			}

			const activity = await ctx.db.query.activities.findFirst({
				where: (a, { eq }) => eq(a.publicId, input.activityPublicId),
				columns: { id: true },
			});
			if (!activity) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Activity not found",
				});
			}

			let user = await ctx.db.query.users.findFirst({
				where: (u, { eq }) => eq(u.clerkUserId, userId),
				columns: { id: true },
			});
			if (!user) {
				await ensureCurrentUser();
				user = await ctx.db.query.users.findFirst({
					where: (u, { eq }) => eq(u.clerkUserId, userId),
					columns: { id: true },
				});
				if (!user) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "User not found",
					});
				}
			}

			await ctx.db.insert(recommendationNotes).values({
				publicId: generateId("rnote"),
				userId: user.id,
				activityId: activity.id,
				slotStartAt,
				slotEndAt,
				note: input.note,
			});

			return { ok: true as const };
		}),
});
