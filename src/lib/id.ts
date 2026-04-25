import { customAlphabet } from "nanoid";
import { z } from "zod";

const nanoid = customAlphabet(
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
	12,
);

// Short prefix denoting the ID type
type TId =
	| "usr" // User
	| "act" // Activity
	| "rec" // Receipt
	| "rcpt" // Split receipt snapshot
	| "ext" // Extraction
	| "person" // Person
	| "split" // Split
	| "alloc" // Allocation
	| "pay"; // Payer

export const generateId = (idType: TId) => {
	return `${idType}_${nanoid()}`;
};

export const prefixedIdSchema = (prefix: TId) =>
	z.string().regex(new RegExp(`^${prefix}_[0-9A-Za-z]{12}$`));

export const activityIdSchema = prefixedIdSchema("act");
export const userIdSchema = prefixedIdSchema("usr");
