import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
	return (
		<main className="grid min-h-screen place-items-center px-4 py-10">
			<SignIn />
		</main>
	);
}
