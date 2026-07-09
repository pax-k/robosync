import type { Context } from "hono";
import { ZodError } from "zod";
import { WorkspaceError } from "../domain";

export function handleWorkspaceError(c: Context, error: unknown) {
	if (error instanceof WorkspaceError) {
		return c.json(
			{
				error: error.code,
				message: error.message,
			},
			error.status
		);
	}
	if (error instanceof ZodError) {
		return c.json(
			{
				error: "invalid_request",
				issues: error.issues,
				message: "Request validation failed.",
			},
			400
		);
	}
	throw error;
}
