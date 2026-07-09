import { HA2HA_HEADERS } from "@ha2ha/protocol";
import type { EvlogVariables } from "evlog/hono";
import type { Hono } from "hono";
import { formatRawListing, normalizeFilePath } from "../domain";
import {
	authorizeRead,
	handleWorkspaceError,
	rawFilePathFromRequest,
	requireFile,
	requireWorkspace,
	serializeWorkspaceEvent,
} from "../route-support";
import { listWorkspaceEvents, listWorkspaceFiles, readObjectBody } from "../storage";

export function registerRawRoutes(router: Hono<EvlogVariables>) {
	router.get("/w/:workspaceId/raw", async (c) => {
		try {
			const workspace = await requireWorkspace(c.req.param("workspaceId"));
			await authorizeRead(workspace, c.req.raw);
			const files = await listWorkspaceFiles(workspace.id);
			return c.text(
				formatRawListing({
					files: files.map((file) => file.path),
					id: workspace.id,
					title: workspace.title,
					updatedAt: workspace.updated_at,
				}),
				200,
				{
					"Content-Type": "text/plain; charset=utf-8",
				}
			);
		} catch (error) {
			return handleWorkspaceError(c, error);
		}
	});
	
	router.get("/w/:workspaceId/raw/events", async (c) => {
		try {
			const workspace = await requireWorkspace(c.req.param("workspaceId"));
			await authorizeRead(workspace, c.req.raw);
			const events = await listWorkspaceEvents(workspace.id);
			return c.json({
				events: events.map(serializeWorkspaceEvent),
				workspaceId: workspace.id,
			});
		} catch (error) {
			return handleWorkspaceError(c, error);
		}
	});
	
	router.get("/w/:workspaceId/raw/*", async (c) => {
		try {
			const workspaceId = c.req.param("workspaceId");
			const workspace = await requireWorkspace(workspaceId);
			await authorizeRead(workspace, c.req.raw);
			const path = normalizeFilePath(
				rawFilePathFromRequest(workspaceId, c.req.raw)
			);
			const file = await requireFile(workspace.id, path);
			const body = await readObjectBody(file);
	
			return new Response(body, {
				headers: {
					"Content-Type": file.content_type,
					ETag: `"${file.version}"`,
					[HA2HA_HEADERS.fileVersion]: String(file.version),
					[HA2HA_HEADERS.path]: file.path,
				},
			});
		} catch (error) {
			return handleWorkspaceError(c, error);
		}
	});
}
