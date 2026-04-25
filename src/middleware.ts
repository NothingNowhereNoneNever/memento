import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/login(.*)", "/api/trpc(.*)"]);

export default clerkMiddleware(async (auth, req) => {
	const { userId } = await auth();
	const { pathname } = req.nextUrl;

	if (pathname === "/" && !userId) {
		return NextResponse.redirect(new URL("/login", req.url));
	}

	if (pathname.startsWith("/login") && userId) {
		return NextResponse.redirect(new URL("/", req.url));
	}

	if (!isPublicRoute(req)) {
		await auth.protect();
	}
});

export const config = {
	matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
