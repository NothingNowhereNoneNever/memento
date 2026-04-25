import { UserProfile } from "@clerk/nextjs";

export default function SettingsPage() {
	return (
		<main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10">
			<UserProfile
				additionalOAuthScopes={{
					google: [
						"https://www.googleapis.com/auth/calendar.readonly",
						"https://www.googleapis.com/auth/calendar.events.readonly",
					],
				}}
				path="/settings"
				routing="path"
			/>
		</main>
	);
}
