import { writeFile } from "node:fs/promises";
import alchemy from "alchemy";
import { D1Database, R2Bucket, Vite, Worker } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

const app = await alchemy("mdsync");
const TRAILING_SLASH_PATTERN = /\/$/;

const db = await D1Database("database", {
	migrationsDir: "../../packages/db/src/migrations",
});

const files = await R2Bucket("files");
const deployWeb = process.env.ROBOSYNC_SERVER_ONLY !== "1";
const devServerPort = positiveInteger(
	"ROBOSYNC_DEV_SERVER_PORT",
	process.env.ROBOSYNC_DEV_SERVER_PORT ?? "3000"
);
export const web = deployWeb
	? await Vite("web", {
			assets: {
				directory: "dist",
				run_worker_first: true,
			},
			bindings: {
				API_ORIGIN: process.env.VITE_API_BASE_URL ?? "",
			},
			build: {
				command: "pnpm build",
				env: {
					VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? "",
				},
			},
			cwd: "../../apps/web",
			dev: {
				command: "pnpm dev:bare",
				domain: "localhost:5173",
				env: {
					VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? "",
				},
			},
			entrypoint: "src/worker.ts",
		})
	: undefined;
export const ha2ha = deployWeb
	? await Vite("ha2ha", {
			assets: {
				directory: "dist",
				run_worker_first: true,
			},
			build: {
				command: "pnpm build",
			},
			cwd: "../../apps/ha2ha",
			dev: {
				command: "pnpm dev",
				domain: "localhost:5174",
			},
			entrypoint: "src/worker.ts",
		})
	: undefined;

const betterAuthSecret = requiredValue(
	"BETTER_AUTH_SECRET",
	alchemy.secret.env.BETTER_AUTH_SECRET
);
const betterAuthUrl = requiredValue(
	"BETTER_AUTH_URL",
	process.env.BETTER_AUTH_URL ?? alchemy.env.BETTER_AUTH_URL
);
const webOrigin = withoutTrailingSlash(
	process.env.WEB_ORIGIN ??
		(web
			? requiredValue("web.url", web.url)
			: requiredValue("CORS_ORIGIN", alchemy.env.CORS_ORIGIN))
);

export const server = await Worker("server", {
	bindings: {
		BETTER_AUTH_SECRET: betterAuthSecret,
		BETTER_AUTH_URL: betterAuthUrl,
		CORS_ORIGIN: webOrigin,
		DB: db,
		FILES: files,
		WEB_ORIGIN: webOrigin,
	},
	compatibility: "node",
	cwd: "../../apps/server",
	dev: {
		port: devServerPort,
	},
	entrypoint: "src/index.ts",
	url: true,
});

if (web) {
	console.log(`Web    -> ${web.url}`);
} else {
	console.log("Web    -> skipped (ROBOSYNC_SERVER_ONLY=1)");
}
if (ha2ha) {
	console.log(`HA2HA  -> ${ha2ha.url}`);
} else {
	console.log("HA2HA  -> skipped (ROBOSYNC_SERVER_ONLY=1)");
}
console.log(`Server -> ${server.url}`);

const deployEvidence = {
	ha2haUrl: ha2ha?.url ?? null,
	serverOnly: !deployWeb,
	serverUrl: server.url,
	webUrl: web?.url ?? null,
};
console.log(`ROBOSYNC_DEPLOY_EVIDENCE ${JSON.stringify(deployEvidence)}`);
if (process.env.ROBOSYNC_DEPLOY_EVIDENCE_PATH) {
	await writeFile(
		process.env.ROBOSYNC_DEPLOY_EVIDENCE_PATH,
		`${JSON.stringify(deployEvidence, null, 2)}\n`
	);
}

await app.finalize();

function requiredValue<T>(name: string, value: T | null | undefined): T {
	if (value === null || value === undefined || value === "") {
		throw new Error(`${name} is required.`);
	}
	return value;
}

function withoutTrailingSlash(value: string) {
	return value.replace(TRAILING_SLASH_PATTERN, "");
}

function positiveInteger(name: string, value: string) {
	const parsedValue = Number(value);
	if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
		throw new Error(`${name} must be a positive integer.`);
	}
	return parsedValue;
}
