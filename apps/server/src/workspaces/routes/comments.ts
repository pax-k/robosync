import {
	createWorkspaceCommentRequestSchema,
	resolveWorkspaceCommentRequestSchema,
} from "@mdsync/contracts/workspaces";
import type { EvlogVariables } from "evlog/hono";
import type { Hono } from "hono";
import { z } from "zod";
import { normalizeFilePath, WorkspaceError } from "../domain";
import {
	authorizeRead,
	authorizeWrite,
	handleWorkspaceError,
	requireComment,
	requireWorkspace,
	serializeWorkspaceComment,
} from "../route-support";
import {
	createWorkspaceComment,
	getWorkspaceFileVersion,
	listWorkspaceComments,
	resolveWorkspaceComment,
} from "../storage";

const commentIdSchema = z.string().trim().min(1).max(160);

export function registerCommentRoutes(router: Hono<EvlogVariables>) {
	router.get("/api/workspaces/:workspaceId/comments", async (c) => {
		try {
			const workspace = await requireWorkspace(c.req.param("workspaceId"));
			await authorizeRead(workspace, c.req.raw);
			const pathQuery = c.req.query("path");
			const path = pathQuery ? normalizeFilePath(pathQuery) : undefined;
			const comments = await listWorkspaceComments({
				path,
				workspaceId: workspace.id,
			});

			return c.json({
				comments: comments.map(serializeWorkspaceComment),
				workspaceId: workspace.id,
			});
		} catch (error) {
			return handleWorkspaceError(c, error);
		}
	});

	router.post("/api/workspaces/:workspaceId/comments", async (c) => {
		try {
			const workspace = await requireWorkspace(c.req.param("workspaceId"));
			await authorizeWrite(workspace, c.req.raw);
			const parsed = createWorkspaceCommentRequestSchema.parse(
				await c.req.json()
			);
			const path = normalizeFilePath(parsed.path);
			const fileVersion = await getWorkspaceFileVersion({
				path,
				version: parsed.version,
				workspaceId: workspace.id,
			});

			if (!fileVersion) {
				throw new WorkspaceError(
					404,
					"comment_anchor_not_found",
					"Comment anchor file version not found."
				);
			}

			const now = new Date().toISOString();
			const id = crypto.randomUUID();
			await createWorkspaceComment({
				anchor: parsed.selector ?? {},
				authorId: parsed.actor,
				body: parsed.body,
				createdAt: now,
				id,
				path,
				updatedAt: now,
				version: parsed.version,
				workspaceId: workspace.id,
			});

			const comment = await requireComment(workspace.id, id);
			return c.json(serializeWorkspaceComment(comment), 201);
		} catch (error) {
			return handleWorkspaceError(c, error);
		}
	});

	router.post(
		"/api/workspaces/:workspaceId/comments/:commentId/resolve",
		async (c) => {
			try {
				const workspace = await requireWorkspace(c.req.param("workspaceId"));
				await authorizeWrite(workspace, c.req.raw);
				const commentId = commentIdSchema.parse(c.req.param("commentId"));
				const parsed = resolveWorkspaceCommentRequestSchema.parse(
					await c.req.json()
				);
				const existing = await requireComment(workspace.id, commentId);

				if (!existing.resolved_at) {
					const now = new Date().toISOString();
					await resolveWorkspaceComment({
						actor: parsed.actor,
						commentId,
						now,
						workspaceId: workspace.id,
					});
				}

				const comment = await requireComment(workspace.id, commentId);
				return c.json(serializeWorkspaceComment(comment));
			} catch (error) {
				return handleWorkspaceError(c, error);
			}
		}
	);
}
