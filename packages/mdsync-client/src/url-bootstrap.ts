import { mdsyncDiscoveryResponseSchema } from "@mdsync/contracts/workspaces";
import { createMdsyncClient } from "./client";
import { err, ok } from "./errors";
import type {
	CreateMdsyncClientFromUrlInput,
	MdsyncAuth,
	MdsyncResult,
	MdsyncWorkspaceConnection,
	MdsyncWorkspaceRouteKind,
	ParsedMdsyncWorkspaceUrl,
} from "./types";

const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "[::1]", "localhost"]);
const WORKSPACE_PATH_PATTERN = /^\/w\/([^/]+)(?:\/(.*))?$/u;

export function parseMdsyncWorkspaceUrl(
	input: string
): MdsyncResult<ParsedMdsyncWorkspaceUrl> {
	let url: URL;
	try {
		url = new URL(input);
	} catch {
		return err(
			"validation_error",
			"Expected an absolute MDSync workspace URL."
		);
	}
	if (url.username || url.password) {
		return err(
			"validation_error",
			"MDSync URLs cannot contain URL credentials."
		);
	}
	if (!isAllowedProtocol(url)) {
		return err(
			"validation_error",
			"MDSync URLs require HTTPS, except for local development."
		);
	}
	const match = WORKSPACE_PATH_PATTERN.exec(url.pathname);
	if (!match?.[1]) {
		return err("validation_error", "Expected an MDSync workspace route.");
	}
	const route = parseRoute(match[2] ?? "");
	if (!route.ok) {
		return route;
	}
	const auth = parseAuth(url.searchParams);
	if (!auth.ok) {
		return auth;
	}
	try {
		return ok({
			auth: auth.data,
			filePath: route.data.filePath,
			origin: url.origin,
			route: route.data.kind,
			workspaceId: decodeURIComponent(match[1]),
		});
	} catch {
		return err("validation_error", "MDSync workspace URL encoding is invalid.");
	}
}

export async function createMdsyncClientFromUrl({
	actor,
	fetch: fetchImpl = fetch,
	url,
}: CreateMdsyncClientFromUrlInput): Promise<
	MdsyncResult<MdsyncWorkspaceConnection>
> {
	if (!actor.trim()) {
		return err("validation_error", "A stable actor handle is required.");
	}
	const parsed = parseMdsyncWorkspaceUrl(url);
	if (!parsed.ok) {
		return parsed;
	}
	let response: Response;
	try {
		response = await fetchImpl(
			`${parsed.data.origin}/.well-known/mdsync.json`,
			{
				headers: { Accept: "application/json" },
				redirect: "error",
			}
		);
	} catch {
		return err("transport_error", "MDSync discovery request failed.");
	}
	if (!response.ok) {
		return err(
			response.status === 503 ? "discovery_unconfigured" : "transport_error",
			"MDSync discovery is unavailable.",
			{ status: response.status }
		);
	}
	let payload: unknown;
	try {
		payload = await response.json();
	} catch {
		return err("validation_error", "MDSync discovery returned invalid JSON.");
	}
	const discovery = mdsyncDiscoveryResponseSchema.safeParse(payload);
	if (!discovery.success) {
		return err(
			"validation_error",
			"MDSync discovery returned an invalid contract."
		);
	}
	if (
		parsed.data.origin !== discovery.data.webOrigin &&
		parsed.data.origin !== discovery.data.apiOrigin
	) {
		return err(
			"validation_error",
			"MDSync discovery does not match the pasted URL origin."
		);
	}
	const client = createMdsyncClient({
		actor: actor.trim(),
		apiOrigin: discovery.data.apiOrigin,
		auth: parsed.data.auth,
		fetch: fetchImpl,
		webOrigin: discovery.data.webOrigin,
		workspaceId: parsed.data.workspaceId,
	});
	return ok({
		access: accessFromAuth(parsed.data.auth),
		apiOrigin: discovery.data.apiOrigin,
		client,
		webOrigin: discovery.data.webOrigin,
		workspaceId: parsed.data.workspaceId,
	});
}

function isAllowedProtocol(url: URL) {
	return (
		url.protocol === "https:" ||
		(url.protocol === "http:" && LOCAL_HOSTNAMES.has(url.hostname))
	);
}

function parseAuth(searchParams: URLSearchParams): MdsyncResult<MdsyncAuth> {
	const editTokens = searchParams.getAll("edit");
	const readTokens = searchParams.getAll("k");
	if (editTokens.length > 1 || readTokens.length > 1) {
		return err("validation_error", "MDSync URL capabilities are ambiguous.");
	}
	const [editToken] = editTokens;
	const [readToken] = readTokens;
	if (editToken !== undefined && readToken !== undefined) {
		return err(
			"validation_error",
			"MDSync URL cannot contain read and edit capabilities together."
		);
	}
	if (editToken !== undefined) {
		return editToken
			? ok({ kind: "edit-token", token: editToken })
			: err("validation_error", "MDSync edit capability is empty.");
	}
	if (readToken !== undefined) {
		return readToken
			? ok({ kind: "read-token", token: readToken })
			: err("validation_error", "MDSync read capability is empty.");
	}
	return ok({ kind: "none" });
}

function parseRoute(remainder: string): MdsyncResult<{
	filePath: string | null;
	kind: MdsyncWorkspaceRouteKind;
}> {
	if (!remainder) {
		return ok({ filePath: null, kind: "overview" });
	}
	if (
		remainder === "work" ||
		remainder === "activity" ||
		remainder === "settings"
	) {
		return ok({ filePath: null, kind: remainder });
	}
	for (const kind of ["files", "raw"] as const) {
		if (remainder === kind) {
			return ok({ filePath: null, kind });
		}
		if (remainder.startsWith(`${kind}/`)) {
			try {
				return ok({
					filePath: remainder
						.slice(kind.length + 1)
						.split("/")
						.map(decodeURIComponent)
						.join("/"),
					kind,
				});
			} catch {
				return err("validation_error", "MDSync file path encoding is invalid.");
			}
		}
	}
	return err("validation_error", "Unsupported MDSync workspace route.");
}

function accessFromAuth(auth: MdsyncAuth) {
	if (auth.kind === "edit-token" || auth.kind === "bearer") {
		return "edit" as const;
	}
	return auth.kind === "read-token" ? ("read" as const) : ("public" as const);
}
