import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@mdsync/api/context";
import { appRouter } from "@mdsync/api/routers/index";
import { createAuth } from "@mdsync/auth";
import { env } from "@mdsync/env/server";
import { initLogger } from "evlog";
import {
	type BetterAuthInstance,
	createAuthMiddleware,
} from "evlog/better-auth";
import { type EvlogVariables, evlog } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { setWorkspaceBindings } from "./workspaces/bindings";
import { workspaceRoutes } from "./workspaces/routes";

setWorkspaceBindings(env);

initLogger({
	env: { service: "mdsync-server" },
});

const app = new Hono<EvlogVariables>();

app.use(evlog());
app.use("*", async (c, next) => {
	const identifyUser = createAuthMiddleware(
		createAuth() as BetterAuthInstance,
		{
			exclude: ["/api/auth/**", "/api/workspaces/**", "/w/**"],
			maskEmail: true,
		}
	);
	await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);
	await next();
});

app.use(
	"/*",
	cors({
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["DELETE", "GET", "OPTIONS", "POST", "PUT"],
		credentials: true,
		origin: env.CORS_ORIGIN,
	})
);

app.route("/", workspaceRoutes);

app.on(["POST", "GET"], "/api/auth/*", (c) => createAuth().handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		createContext: (_opts, context) => createContext({ context }),
		router: appRouter,
	})
);

app.get("/", (c) => c.text("OK"));

export default app;
