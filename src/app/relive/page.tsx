import { ReliveClient } from "./relive-client";

export default function RelivePage() {
	return (
		<main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-3xl flex-col gap-6 px-4 py-10">
			<ReliveClient />
		</main>
	);
}
