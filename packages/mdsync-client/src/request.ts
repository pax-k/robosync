import { workspaceVersionConflictResponseSchema } from "@mdsync/contracts/workspaces";
import { err, getRecord, getString, messageFromCaught, toErrorCode } from "./errors";
import { parseJsonPayload } from "./parsers";
import type { AuthRequirement, MdsyncAuth, MdsyncResult } from "./types";

export interface RequestInput<Data> {
	body?: unknown;
	method?: string;
	parse: (value: unknown) => Data;
	pathname: (workspaceId: string) => string;
	query?: Record<string, string>;
	requirement?: AuthRequirement;
}

export const requestJson = async <Data>({
	auth,
	body,
	fetchImpl,
	method,
	origin,
	parse,
	pathname,
	query,
	requirement,
}: {
	auth: MdsyncAuth;
	body?: unknown;
	fetchImpl: typeof fetch;
	method: string;
	origin: string;
	parse: (value: unknown) => Data;
	pathname: string;
	query?: Record<string, string>;
	requirement: AuthRequirement;
}): Promise<MdsyncResult<Data>> => {
	if (requirement === "edit" && !canUseEditAuth(auth)) {
		return err(
			"missing_token",
			"An edit token or bearer token is required for this MDSync operation."
		);
	}

	const url = buildRequestUrl({ auth, origin, pathname, query, requirement });
	const init = withAuthorizationHeader(
		{
			body: body === undefined ? undefined : JSON.stringify(body),
			headers:
				body === undefined ? undefined : { "Content-Type": "application/json" },
			method,
		},
		auth
	);

	try {
		const response = await fetchImpl(url, init);
		if (response.status === 409) {
			return parseConflict(response);
		}
		if (!response.ok) {
			return responseError(response);
		}
		const payload = await readJson(response);
		const parsed = parseJsonPayload(parse, payload);
		return parsed.ok ? parsed : parsed;
	} catch (error) {
		return err("transport_error", messageFromCaught(error));
	}
};

export const withAuthorizationHeader = (
	init: RequestInit,
	auth: MdsyncAuth
): RequestInit => {
	if (!(auth.kind === "edit-token" || auth.kind === "bearer")) {
		return init;
	}
	const headers = new Headers(init.headers);
	headers.set("Authorization", `Bearer ${auth.token}`);
	return { ...init, headers };
};

export const canUseEditAuth = (auth: MdsyncAuth) =>
	auth.kind === "edit-token" || auth.kind === "bearer";

const buildRequestUrl = ({
	auth,
	origin,
	pathname,
	query,
	requirement,
}: {
	auth: MdsyncAuth;
	origin: string;
	pathname: string;
	query?: Record<string, string>;
	requirement: AuthRequirement;
}) => {
	const url = new URL(pathname, `${origin}/`);
	for (const [key, value] of Object.entries(query ?? {})) {
		url.searchParams.set(key, value);
	}
	if (auth.kind === "read-token" && requirement === "read") {
		url.searchParams.set("k", auth.token);
	}
	return url.toString();
};

const readJson = async (response: Response): Promise<unknown> => {
	const text = await response.text();
	return text.length > 0 ? JSON.parse(text) : {};
};

const parseConflict = async <Data>(
	response: Response
): Promise<MdsyncResult<Data>> => {
	const body = await readJson(response);
	const parsed = parseJsonPayload(
		(value) => workspaceVersionConflictResponseSchema.parse(value),
		body
	);
	if (!parsed.ok) {
		return parsed;
	}
	return err("version_conflict", parsed.data.message, {
		latest: parsed.data.latest,
		status: response.status,
	});
};

const responseError = async <Data>(
	response: Response
): Promise<MdsyncResult<Data>> => {
	let body: unknown = {};
	try {
		body = await readJson(response);
	} catch {
		body = {};
	}
	const record = getRecord(body);
	return err(
		toErrorCode(
			getString(
				record,
				"error",
				response.status === 404 ? "not_found" : "transport_error"
			)
		),
		getString(record, "message", response.statusText),
		{ status: response.status }
	);
};
