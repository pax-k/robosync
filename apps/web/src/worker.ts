/// <reference types="@cloudflare/workers-types" />

interface AssetFetcher {
	fetch: (request: Request) => Promise<Response>;
}

interface Env {
	API_ORIGIN?: string;
	ASSETS: AssetFetcher;
}

const HTML_ACCEPT_PATTERN = /\btext\/html\b/;
const TRAILING_SLASH_PATTERN = /\/$/u;
const WELL_KNOWN_PATH = "/.well-known/mdsync.json";

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const requestUrl = new URL(request.url);
		if (request.method === "GET" && requestUrl.pathname === WELL_KNOWN_PATH) {
			return discoveryResponse(requestUrl, env.API_ORIGIN);
		}
		const assetResponse = await env.ASSETS.fetch(request);

		if (
			assetResponse.status !== 404 ||
			request.method !== "GET" ||
			!acceptsHtml(request)
		) {
			return assetResponse;
		}

		const indexUrl = new URL(request.url);
		indexUrl.pathname = "/index.html";
		indexUrl.search = "";

		return env.ASSETS.fetch(new Request(indexUrl, request));
	},
} satisfies ExportedHandler<Env>;

function discoveryResponse(requestUrl: URL, configuredOrigin?: string) {
	const apiOrigin = resolveApiOrigin(requestUrl, configuredOrigin);
	if (!apiOrigin) {
		return Response.json(
			{
				error: "discovery_unconfigured",
				message: "MDSync API discovery is not configured for this domain.",
			},
			{ status: 503 }
		);
	}
	return Response.json(
		{
			apiOrigin,
			discoveryVersion: 1,
			product: "mdsync",
			webOrigin: requestUrl.origin,
		},
		{ headers: { "Cache-Control": "public, max-age=300" } }
	);
}

function resolveApiOrigin(requestUrl: URL, configuredOrigin?: string) {
	const configured = configuredOrigin
		?.trim()
		.replace(TRAILING_SLASH_PATTERN, "");
	if (configured) {
		try {
			if (new URL(configured).origin === configured) {
				return configured;
			}
		} catch {
			return null;
		}
	}
	if (
		requestUrl.hostname === "localhost" ||
		requestUrl.hostname === "127.0.0.1"
	) {
		return `${requestUrl.protocol}//${requestUrl.hostname}:3000`;
	}
	if (requestUrl.hostname.includes("-web-")) {
		return `${requestUrl.protocol}//${requestUrl.hostname.replace("-web-", "-server-")}`;
	}
	return null;
}

function acceptsHtml(request: Request) {
	return HTML_ACCEPT_PATTERN.test(request.headers.get("accept") ?? "");
}
