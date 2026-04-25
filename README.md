# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## Auth + Google Calendar (Clerk)

This app uses **Clerk** for authentication and retrieves **Google Calendar** events using **Clerk-managed OAuth tokens** (no token persistence in the app DB).

### Setup

- **Install deps**

```bash
bun install
```

- **Create a Clerk application**
  - In the Clerk dashboard, create a new app.
  - Copy env vars into `.env` (use `.env.example` as a template):
    - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
    - `CLERK_SECRET_KEY`

- **Enable Google as the only sign-in method**
  - Enable the **Google** provider in Clerk.
  - Disable other providers you don’t want.

- **Request Google Calendar scopes**
  - Add these scopes to the Google connection in Clerk:
    - `https://www.googleapis.com/auth/calendar.readonly`
    - `https://www.googleapis.com/auth/calendar.events.readonly`

- **Redirect URLs**
  - Sign-in entrypoint is `http://localhost:3000/login`.
  - The app redirects:
    - logged out `/` → `/login`
    - logged in `/login` → `/`

### Local dev

```bash
bun run dev
```

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [Clerk](https://clerk.com)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
