import type { ActivityFilters } from "./workspace-product";
import type { WorkspaceNamedCount } from "./workspace-types";

const WORKSPACE_PATH_PATTERN = /^\/w\/([^/]+)/;
const TRAILING_SLASH_PATTERN = /\/$/;

export const DEFAULT_ACTIVITY_FILTERS = {
	actor: "",
	path: "",
	time: "all",
	type: "",
} as const satisfies ActivityFilters;

export const PRODUCT_ACTOR = "web";

export function formatBytes(sizeBytes: number) {
	if (sizeBytes < 1024) {
		return `${sizeBytes} B`;
	}
	const kibibytes = sizeBytes / 1024;
	if (kibibytes < 1024) {
		return `${kibibytes.toFixed(1)} KB`;
	}
	return `${(kibibytes / 1024).toFixed(1)} MB`;
}

export function formatCounts(counts: WorkspaceNamedCount[]) {
	if (counts.length === 0) {
		return "no records";
	}
	return counts.map((item) => `${item.name}: ${item.count}`).join(", ");
}

export function formatDateTime(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

export function formatStatusLabel(value: string) {
	return value.replaceAll("_", " ");
}

export function capabilityQuery({
	editToken,
	readToken,
}: {
	editToken: string | null;
	readToken: string | null;
}) {
	if (editToken) {
		return `?edit=${encodeURIComponent(editToken)}`;
	}
	if (readToken) {
		return `?k=${encodeURIComponent(readToken)}`;
	}
	return "";
}

export function preserveCapabilitySearch(search: string) {
	const params = new URLSearchParams(search);
	const preserved = new URLSearchParams();
	const editToken = params.get("edit");
	const readToken = params.get("k");
	if (editToken) {
		preserved.set("edit", editToken);
	}
	if (readToken) {
		preserved.set("k", readToken);
	}
	return preserved;
}

export function workspaceHref({
	panel,
	path,
	search,
}: {
	panel?: "comments" | "history";
	path: string;
	search: string;
}) {
	const params = preserveCapabilitySearch(search);
	if (panel) {
		params.set("panel", panel);
	}
	const query = params.toString();
	return query ? `${path}?${query}` : path;
}

export function encodePathSegments(path: string) {
	return path.split("/").map(encodeURIComponent).join("/");
}

export function getSearchParam(name: string) {
	return new URLSearchParams(window.location.search).get(name);
}

export function replaceWorkspaceUrl({
	editToken,
	workspaceId,
}: {
	editToken: string | null;
	workspaceId: string;
}) {
	const path = `/w/${encodeURIComponent(workspaceId)}`;
	const nextUrl = editToken
		? `${path}?edit=${encodeURIComponent(editToken)}`
		: path;
	window.history.replaceState(null, "", nextUrl);
	window.dispatchEvent(new PopStateEvent("popstate"));
}

export function downloadJsonFile(payload: unknown, filename: string) {
	const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}

export function getWorkspaceIdFromPath() {
	const match = window.location.pathname.match(WORKSPACE_PATH_PATTERN);
	return match ? decodeURIComponent(match[1] ?? "") : null;
}

export function resolveApiBaseUrl() {
	const configured = import.meta.env.VITE_API_BASE_URL?.replace(
		TRAILING_SLASH_PATTERN,
		""
	);
	if (configured) {
		return configured;
	}

	const { hostname, origin, protocol } = window.location;
	if (hostname === "localhost" || hostname === "127.0.0.1") {
		return "http://localhost:3000";
	}
	if (hostname.includes("-web-")) {
		return `${protocol}//${hostname.replace("-web-", "-server-")}`;
	}
	return origin;
}
