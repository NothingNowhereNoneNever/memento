import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";

import { generateId } from "@/lib/id";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

function deriveName(user: {
	firstName: string | null;
	lastName: string | null;
	username: string | null;
}) {
	const fullName = [user.firstName, user.lastName]
		.filter(Boolean)
		.join(" ")
		.trim();
	return fullName.length > 0 ? fullName : user.username;
}

function derivePrimaryEmail(user: {
	primaryEmailAddressId: string | null;
	emailAddresses: Array<{ id: string; emailAddress: string }>;
}) {
	return (
		user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
			?.emailAddress ??
		user.emailAddresses[0]?.emailAddress ??
		null
	);
}

export async function ensureCurrentUser() {
	const { userId } = await auth();
	if (!userId) return null;

	const client = await clerkClient();
	const clerkUser = await client.users.getUser(userId);

	await db
		.insert(users)
		.values({
			publicId: generateId("usr"),
			clerkUserId: userId,
			email: derivePrimaryEmail(clerkUser),
			name: deriveName(clerkUser),
			imageUrl: clerkUser.imageUrl ?? null,
		})
		.onConflictDoUpdate({
			target: users.clerkUserId,
			set: {
				email: derivePrimaryEmail(clerkUser),
				name: deriveName(clerkUser),
				imageUrl: clerkUser.imageUrl ?? null,
				updatedAt: new Date(),
			},
		});

	return userId;
}
