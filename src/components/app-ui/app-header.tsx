"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";

export function AppHeader() {
	const { isSignedIn } = useAuth();

	return (
		<header className="border-zinc-200 border-b bg-white">
			<div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
				<nav className="flex items-center gap-4">
					<Link className="font-semibold text-sm" href="/">
						Memento
					</Link>
					{isSignedIn ? (
						<>
							<Link
								className="text-sm text-zinc-600 hover:text-zinc-900"
								href="/"
							>
								Today
							</Link>
							<Link
								className="text-sm text-zinc-600 hover:text-zinc-900"
								href="/relive"
							>
								Relive
							</Link>
							<Link
								className="text-sm text-zinc-600 hover:text-zinc-900"
								href="/settings"
							>
								Settings
							</Link>
						</>
					) : null}
				</nav>

				<div className="flex items-center gap-2">
					{isSignedIn ? (
						<UserButton />
					) : (
						<Link
							className="text-sm text-zinc-600 hover:text-zinc-900"
							href="/login"
						>
							Sign in
						</Link>
					)}
				</div>
			</div>
		</header>
	);
}
