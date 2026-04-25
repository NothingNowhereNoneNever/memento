import { customAlphabet } from "nanoid";

const nanoid = customAlphabet(
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
	12,
);

// Short prefix denoting the ID type
type TId =
	| "usr" // User
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
