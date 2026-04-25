---
name: Auth and timeline foundation
overview: Set up Clerk authentication with Google-only sign-in, protect app routes with redirect behavior, and implement a logged-in home timeline backed by live Google Calendar data via Clerk-managed OAuth tokens.
todos:
  - id: setup-clerk-core
    content: Install Clerk and wire provider, env schema, and middleware/proxy guard.
    status: pending
  - id: add-login-route
    content: Implement `/login` with Clerk sign-in restricted to Google and auth redirect behavior.
    status: pending
  - id: google-calendar-server
    content: Add server token retrieval from Clerk and fetch/normalize today’s Google Calendar events.
    status: pending
  - id: timeline-types-ui
    content: Create reusable timeline types/helpers and render logged-in day timeline on `/`.
    status: pending
  - id: write-clerk-setup-docs
    content: Document Clerk + Google OAuth setup and required env/scope configuration.
    status: pending
  - id: verify-auth-flow
    content: Run check/typecheck and validate public/auth routing and timeline behavior manually.
    status: pending
isProject: false
---

# Auth + Calendar Foundation Plan

## Confirmed decisions
- Use **Clerk for application auth/session management**.
- Use **Google OAuth via Clerk** (provider token retrieval) for Calendar API access.
- Public/unauthenticated users hitting `/` are redirected to `/login`.
- Login UI uses Clerk's hosted/sign-in component experience and is restricted to Google.
- Logged-in `/` shows the current day timeline from live Google Calendar data.
- This repo is **Bun-only** for package management and script execution (no `npm`/`npx`).

## Implementation steps

### 1) Install and configure Clerk in Next.js app router
- Update deps and env handling for Clerk using Bun:
  - `bun add @clerk/nextjs@latest`
- Wrap root app in `ClerkProvider` in [`/Users/aditya/projects/personal/memento/src/app/layout.tsx`](/Users/aditya/projects/personal/memento/src/app/layout.tsx).
- Add `proxy.ts` route protection file using `clerkMiddleware()` from `@clerk/nextjs/server`.
- Extend env schema in [`/Users/aditya/projects/personal/memento/src/env.js`](/Users/aditya/projects/personal/memento/src/env.js) and example env file for required Clerk keys.

### 2) Route model: public vs authenticated
- Add public `/login` route using Clerk sign-in component with Google-only strategy.
- Add redirect guard logic:
  - unauthenticated `/` -> `/login`
  - authenticated `/login` -> `/`
- Keep any API/webhook routes that must remain public explicitly listed in middleware matcher exclusions.
- Use App Router only (`src/app/**`), no Pages Router patterns (`_app.tsx`/`pages/**`).

### 3) Google Calendar integration via Clerk-managed OAuth
- Add server utility to fetch current user's Google OAuth access token through Clerk (no token persistence), using async `auth()` and Clerk server APIs from `@clerk/nextjs/server`.
- Request/verify Google scopes used for calendar reads:
  - `https://www.googleapis.com/auth/calendar.readonly`
  - `https://www.googleapis.com/auth/calendar.events.readonly`
- Implement server fetch for today's events from Google Calendar API with timezone-aware day window.
- Return normalized timeline data for UI consumption.

### 4) Timeline domain types and normalization
- Add foundational types for build-out in a dedicated module (e.g. `src/lib/calendar.ts` or `src/lib/timeline.ts`):
  - provider event type
  - normalized timeline block type
  - day timeline response envelope (events, free slots, metadata)
- Include lightweight parse/normalize helpers so future gap-prompts can plug in without schema churn.

### 5) Logged-in home timeline UI
- Replace starter home content in [`/Users/aditya/projects/personal/memento/src/app/page.tsx`](/Users/aditya/projects/personal/memento/src/app/page.tsx) with:
  - current day heading
  - ordered event blocks
  - explicit loading/error/empty states
- Keep UI minimal but structured for upcoming prompt cards insertion.

### 6) Clerk setup instructions (docs)
- Add concise setup section to project docs (README or dedicated auth doc):
  - create Clerk app
  - enable Google provider
  - configure Google scopes for calendar read
  - set Clerk env vars and redirect URLs
  - local dev callback URL notes
  - reconnect behavior if Google token unavailable
- Include Bun-first commands in docs (`bun add`, `bun run dev`) and avoid npm-based command examples.

## Guardrails and deprecations
- Required:
  - Use `clerkMiddleware()` (not legacy middleware helpers).
  - Keep `ClerkProvider` mounted inside `<body>` in app layout.
  - Import Clerk APIs only from `@clerk/nextjs` or `@clerk/nextjs/server`.
- Do not use:
  - `authMiddleware()` and other deprecated auth middleware APIs.
  - Pages Router auth setup patterns.

## Key files expected to change
- [`/Users/aditya/projects/personal/memento/package.json`](/Users/aditya/projects/personal/memento/package.json)
- [`/Users/aditya/projects/personal/memento/src/app/layout.tsx`](/Users/aditya/projects/personal/memento/src/app/layout.tsx)
- [`/Users/aditya/projects/personal/memento/src/app/page.tsx`](/Users/aditya/projects/personal/memento/src/app/page.tsx)
- [`/Users/aditya/projects/personal/memento/src/env.js`](/Users/aditya/projects/personal/memento/src/env.js)
- [`/Users/aditya/projects/personal/memento/.env.example`](/Users/aditya/projects/personal/memento/.env.example)
- new auth/middleware route protection file
- new login route files under `src/app/login`
- new calendar/timeline types + server utility module(s)
- README/auth setup docs

## Validation
- `bun run check`
- `bun run typecheck`
- Manual smoke checks:
  - logged out `/` redirects to `/login`
  - login shows only Google option
  - logged in `/` loads today timeline
  - missing Google grant shows actionable fallback
