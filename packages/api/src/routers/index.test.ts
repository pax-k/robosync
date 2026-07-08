import assert from "node:assert/strict";
import { test } from "node:test";
import { TRPCError } from "@trpc/server";

import type { Context } from "../context";
import { appRouter } from "./index";

test("healthCheck returns OK", async () => {
	const caller = appRouter.createCaller(createContext(null));

	assert.equal(await caller.healthCheck(), "OK");
});

test("privateData rejects callers without a session", async () => {
	const caller = appRouter.createCaller(createContext(null));

	await assert.rejects(
		() => caller.privateData(),
		(error: unknown) =>
			error instanceof TRPCError && error.code === "UNAUTHORIZED"
	);
});

test("privateData returns the session user for authenticated callers", async () => {
	const session = {
		session: {
			id: "session-1",
			token: "token-1",
			userId: "user-1",
		},
		user: {
			email: "pax@example.com",
			id: "user-1",
			name: "Pax",
		},
	} as NonNullable<Context["session"]>;
	const caller = appRouter.createCaller(createContext(session));

	assert.deepEqual(await caller.privateData(), {
		message: "This is private",
		user: session.user,
	});
});

function createContext(session: Context["session"]): Context {
	return {
		auth: null,
		session,
	};
}
