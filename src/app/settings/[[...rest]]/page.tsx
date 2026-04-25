import { UserProfile } from "@clerk/nextjs";

export default function SettingsPage() {
	return (
		<main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10">
			<UserProfile path="/settings" routing="path" />
		</main>
	);
}
