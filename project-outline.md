# Moments — Project Outline

> "Your calendar shows you how busy you are. We show you what's beautiful in between."

## The Idea

Everyday life makes you forget that small moments are still beautiful and meaningful. We only capture the grand — vacations, milestones, events — and let the ordinary slip away. But looking back months or years later, it's the ordinary moments that hit hardest.

Moments reads your calendar, finds the gaps between your busy schedule, and sends you hyper-specific, location-aware nudges to capture what's around you. By the end of the day, you have 5-6 small, real moments — a micro-journal you didn't have to think about starting.

---

## Hackathon Scope (Cornell-Specific Demo)

### What We're Building
A working web app (mobile-first) that:
1. Authenticates users via Clerk
2. Connects to Google Calendar
3. Shows a "day timeline" view — your calendar events with **detour prompts** in the gaps
4. Lets users tap a prompt → capture a moment (photo + optional caption)
5. Shows an end-of-day recap — a scrollable story of your captured moments

### What We're NOT Building (But Will Pitch)
- Push notifications (demo uses in-app nudges)
- RLHF prompt refinement pipeline
- Full location tracking / geofencing
- Social features / sharing

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 14 (App Router)** | Fast to scaffold, good mobile PWA support |
| Auth | **Clerk** | Pre-built Google OAuth, handles calendar permissions |
| Calendar | **Google Calendar API** | Read user's schedule, find gaps |
| Database | **Supabase (Postgres)** | Store captured moments, user preferences |
| Storage | **Supabase Storage** | Photo uploads |
| Styling | **Tailwind CSS** | Rapid UI iteration |
| Deployment | **Vercel** | Instant deploys, good for demo day |
| LLM (stretch) | **Claude API** | Dynamic prompt generation based on context |

---

## Data Model

### `users`
```
id              UUID (from Clerk)
clerk_id        TEXT
name            TEXT
email           TEXT
created_at      TIMESTAMP
```

### `moments`
```
id              UUID
user_id         UUID → users.id
prompt_text     TEXT          -- the nudge that triggered this
caption         TEXT          -- user's text response
photo_url       TEXT          -- Supabase storage URL
captured_at     TIMESTAMP
location_name   TEXT          -- e.g., "Arts Quad"
latitude        FLOAT
longitude       FLOAT
```

### `prompts` (curated Cornell prompts)
```
id              UUID
location_name   TEXT          -- e.g., "Slope", "Gates Hall", "Cascadilla Gorge"
latitude        FLOAT
longitude       FLOAT
radius_m        INT           -- geofence radius in meters
prompt_text     TEXT          -- the actual nudge
time_context    TEXT[]        -- e.g., ["golden_hour", "morning", "any"]
weather_context TEXT[]        -- e.g., ["sunny", "snowy", "any"]
activity_hint   TEXT          -- e.g., "post_class", "walking", "studying"
```

---

## Screen-by-Screen Breakdown

### 1. Login Screen
- Clerk's `<SignIn />` component
- Google OAuth with calendar read scope (`calendar.readonly`)
- Tagline: "Your calendar shows you how busy you are. We show you what's beautiful in between."

### 2. Day Timeline (Home — The Core Screen)
This is the heart of the app. It's NOT a traditional calendar view.

**Layout:**
- Vertical timeline running down the screen
- Calendar events appear as solid blocks (muted, de-emphasized)
- **Between** each event block: a "detour card" — the nudge prompt
- Each detour card shows:
  - The time gap (e.g., "45 min before CS 4120")
  - A context-aware prompt (e.g., "You're near the Slope — the leaves are turning, grab a quick photo")
  - A capture button (camera icon)
- Already-captured moments appear as thumbnail cards inline in the timeline
- Top of screen: today's date, moments captured count (e.g., "2 of 6 moments")

**How detour cards are generated:**
1. Fetch today's calendar events
2. Find gaps ≥ 15 minutes between events
3. Use event locations to infer where the user will be
4. Match against curated Cornell prompts for that area + time + weather
5. If no location match, fall back to generic time-based prompts

### 3. Capture Screen (Modal / Overlay)
- Triggered by tapping a detour card's capture button
- Shows the prompt text at the top
- Camera viewfinder (or photo picker)
- Optional caption text field below
- "Save Moment" button
- Quick, minimal — should take <30 seconds

### 4. End-of-Day Recap
- Accessible from bottom nav or auto-triggered in the evening
- Scrollable vertical layout — like an Instagram story but slower, more reflective
- Each moment shows:
  - Time captured
  - The photo
  - The caption
  - The prompt that triggered it
  - Location name
- Soft ambient background, warm typography
- "Your day had 5 beautiful moments" header
- Option to share (stretch goal) or save to camera roll

### 5. Past Days (Stretch)
- Calendar-style grid showing which days have captured moments
- Tap a day → see that day's recap

---

## Curated Cornell Prompt Bank (Seed Data)

Here's the initial set. Each prompt is tied to a location, time context, and optional weather/activity context.

### Arts Quad
- "The Arts Quad is golden right now — find a leaf that catches the light and snap it"
- "Look up at the McGraw Tower clock. What time is it in your life right now? Caption that"
- "Find the weirdest shadow on the quad right now and capture it"

### The Slope
- "The Slope at golden hour is undefeated — go capture that sunset view"
- "Find someone else on the Slope right now. What are they doing? (Don't be creepy, just observe)"
- "Lie down on the Slope for 10 seconds. What do you see? Snap it"
- [snowy] "The Slope covered in snow — capture the footprints"

### Gates Hall
- "You just survived your CS class — grab a victory coffee shot from the vending machine"
- "Find the most chaotic whiteboard in Gates right now. Document it"
- "What's on your screen right now? Screenshot your current state of mind"

### Cascadilla Gorge Trail
- "Point at the Cascadilla Gorge sign and take that classic trail selfie"
- "Find the most interesting rock formation on the trail and photograph it"
- "The sound of water — take a photo of where you hear it loudest"

### Olin / Uris Library
- "What's the view from your study spot? Capture it — future you will miss this"
- "Find the most aesthetic book spine on the nearest shelf"
- "Your study setup right now. Messy? Organized? Document it honestly"

### Collegetown
- "What's in your hand right now? (Coffee? Boba? Phone?) Snap it"
- "The first interesting sign you see in CTown — capture it"

### Teagle / Fitness Center
- "Post-workout selfie with the Touchdown statue — you earned it"
- "What does the gym look like right now? Capture the energy"

### Clock Tower / McGraw
- "The chimes are playing — what song? Caption with your guess"
- [sunset] "Sunset behind the Clock Tower. You know the shot. Go get it"

### Beebe Lake
- "Reflection on Beebe Lake — find the most mirror-still spot"
- "What's the wildlife situation? Spot any geese? Document the drama"

### Generic (Time-Based Fallbacks)
- [morning] "What does your morning look like? Coffee, commute, chaos?"
- [lunch] "What are you eating? No judgment. Just capture it"
- [afternoon] "Midday energy check — selfie showing your current vibe"
- [evening] "Golden hour wherever you are. Find the light and capture it"
- [night] "What does campus look like right now? The night version of your day"

---

## Task Split Suggestion (2-Person Team)

### Person A (Backend + Integration)
- Clerk setup + Google OAuth with calendar scope
- Google Calendar API integration (fetch today's events, parse gaps)
- Supabase schema setup (users, moments, prompts tables)
- Photo upload flow (Supabase Storage)
- API routes: `GET /api/timeline`, `POST /api/moments`, `GET /api/recap`
- Seed the prompt bank into Supabase

### Person B (Frontend + Design)
- Day Timeline screen (the core UI)
- Capture modal/overlay with camera integration
- End-of-day recap screen
- Overall app shell, navigation, transitions
- Mobile-responsive polish
- Demo flow preparation

### Shared
- Prompt matching logic (given a time gap + location → pick best prompt)
- Demo script and presentation

---

## Implementation Order (4-Hour Sprint)

### Hour 1: Foundation
- [ ] `npx create-next-app@latest moments --typescript --tailwind --app`
- [ ] Install deps: `@clerk/nextjs`, `@supabase/supabase-js`, `googleapis`
- [ ] Clerk setup: create app, configure Google OAuth with `calendar.readonly` scope
- [ ] Supabase setup: create project, run schema SQL, create storage bucket
- [ ] Verify auth flow works end-to-end

### Hour 2: Core Data Flow
- [ ] Build `GET /api/calendar` — fetch today's events from Google Calendar
- [ ] Build gap-finding logic: parse events, find ≥15min gaps, attach location hints
- [ ] Build prompt matcher: given gap context → select from prompt bank
- [ ] Build `GET /api/timeline` — return merged view (events + detour prompts)
- [ ] Build Day Timeline UI — render the timeline with event blocks and detour cards

### Hour 3: Capture Flow
- [ ] Build capture modal: camera access (`navigator.mediaDevices`) + photo picker
- [ ] Build `POST /api/moments` — save photo to Supabase Storage, create moment record
- [ ] Wire capture button → modal → save → update timeline with captured moment
- [ ] Build `GET /api/recap` — fetch all moments for today
- [ ] Build Recap screen UI

### Hour 4: Polish + Demo Prep
- [ ] Mobile viewport polish
- [ ] Transitions and micro-animations
- [ ] Fallback: if calendar has no events, show time-based generic prompts
- [ ] Seed demo data (pre-captured moments) for presentation
- [ ] Prepare demo script: login → see timeline → capture a moment → view recap
- [ ] Test the full flow on a phone

---

## Key API Routes

### `GET /api/timeline`
Returns today's merged timeline: calendar events + detour prompts in gaps.

```typescript
// Response shape
{
  date: "2026-04-25",
  moments_captured: 2,
  moments_target: 6,
  items: [
    {
      type: "event",
      title: "CS 4120 Lecture",
      location: "Gates Hall",
      start: "10:25",
      end: "11:15"
    },
    {
      type: "detour",
      gap_minutes: 45,
      prompt: "You just survived compilers — grab a victory coffee at Gates Cafe",
      location_name: "Gates Hall",
      captured: false
    },
    {
      type: "moment",  // already captured
      photo_url: "...",
      caption: "Post-lecture caffeine",
      captured_at: "11:20"
    },
    {
      type: "event",
      title: "Lunch with Jake",
      location: "Collegetown",
      start: "12:00",
      end: "13:00"
    }
  ]
}
```

### `POST /api/moments`
```typescript
// Request: multipart/form-data
{
  photo: File,
  caption?: string,
  prompt_id: string,
  location_name?: string,
  latitude?: number,
  longitude?: number
}
```

### `GET /api/recap`
```typescript
// Response
{
  date: "2026-04-25",
  total_moments: 5,
  moments: [
    {
      photo_url: "...",
      caption: "Morning light through my window",
      prompt_text: "What does your morning look like?",
      location_name: "Collegetown",
      captured_at: "08:45"
    }
    // ...
  ]
}
```

---

## Environment Variables

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Google Calendar (via Clerk OAuth)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Optional: Claude API for dynamic prompts
ANTHROPIC_API_KEY=
```

---

## Stretch Goals (Post-Hackathon Pitch Points)

1. **RLHF on prompts** — track which prompts get captured vs dismissed, surface better ones over time
2. **Weather-aware prompts** — integrate weather API, trigger snow/rain/sunset-specific prompts
3. **GPS geofencing** — real-time location triggers instead of calendar-inferred location
4. **Social layer** — share your recap with friends, see their days
5. **Weekly/monthly compilations** — auto-generated "best of the week" stories
6. **AI-generated prompts** — Claude generates novel prompts based on your capture history, preferences, and context
7. **Push notifications** — real nudges via service worker / native push
8. **Streak + gentle gamification** — "You've captured 14 days in a row" (no guilt, no punishment for missing)

---

## The Pitch (1-Minute Version)

"Open your phone. Look at your camera roll. When's the last time you took a photo that wasn't for someone else or some event? We take 50 photos at a concert but zero of our Tuesday afternoon.

Moments flips your calendar on its head. Instead of showing you how packed your day is, it finds the gaps — the 30 minutes between classes, the walk to the library, your lunch break — and gives you a small, specific, fun nudge to capture what's happening right now.

'You're near the Slope and the sun's going down — go grab that shot.' 'You just survived your compiler class — document that victory coffee.'

By the end of the day, you have 5 or 6 real moments. Not curated. Not filtered. Just... your day. And three months from now, you'll scroll back and think — oh yeah, that was a good Tuesday.

We built this for Cornell. But every campus, every city, every commute has these moments. We just need a nudge to capture them."
