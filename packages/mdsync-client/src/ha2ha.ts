import {
	createHa2haClient as createHa2haProtocolClient,
	createHttpTransport,
} from "@ha2ha/client";
import { err, ok } from "./errors";
import { withAuthorizationHeader } from "./request";
import type {
	CreateHostedHa2haClientInput,
	MdsyncAuth,
	MdsyncResult,
} from "./types";

export const createHostedHa2haClient = ({
	actor,
	auth,
	fetchImpl,
	input,
	origin,
	workspaceId,
}: {
	actor: string;
	auth: MdsyncAuth;
	fetchImpl: typeof fetch;
	input: CreateHostedHa2haClientInput;
	origin: string;
	workspaceId: string;
}): MdsyncResult<ReturnType<typeof createHa2haProtocolClient>> => {
	if (!(auth.kind === "edit-token" || auth.kind === "bearer")) {
		return err(
			"missing_token",
			"Hosted HA2HA client workflows require edit-token or bearer auth."
		);
	}
	return ok(
		createHa2haProtocolClient({
			actor: input.actor ?? actor,
			transport: createHttpTransport({
				authorizeRequest: ({ init }: { init: RequestInit; url: string }) =>
					withAuthorizationHeader(init, auth),
				baseUrl: origin,
				fetch: fetchImpl,
				workspaceId,
			}),
		})
	);
};
