import { workspaceCapabilityKindSchema } from "@mdsync/contracts/workspaces";
import type { EvlogVariables } from "evlog/hono";
import type { Hono } from "hono";
import { workspaceBindings } from "../bindings";
import { randomCapabilityToken, tokenHash, WorkspaceError } from "../domain";
import {
	authorizeWrite,
	buildEditCapabilityLinks,
	buildReadCapabilityLinks,
	handleWorkspaceError,
	requireWorkspace,
	serializeWorkspaceCapabilities,
} from "../route-support";

export function registerCapabilityRoutes(router: Hono<EvlogVariables>) {
	router.get("/api/workspaces/:workspaceId/capabilities", async (c) => {
		try {
			const workspace = await requireWorkspace(c.req.param("workspaceId"));
			await authorizeWrite(workspace, c.req.raw);
			return c.json({
				capabilities: serializeWorkspaceCapabilities(workspace),
				workspaceId: workspace.id,
			});
		} catch (error) {
			return handleWorkspaceError(c, error);
		}
	});
	
	router.post(
		"/api/workspaces/:workspaceId/capabilities/:capability/rotate",
		async (c) => {
			try {
				const workspace = await requireWorkspace(c.req.param("workspaceId"));
				await authorizeWrite(workspace, c.req.raw);
				const capability = workspaceCapabilityKindSchema.parse(
					c.req.param("capability")
				);
				const token = randomCapabilityToken();
				const now = new Date().toISOString();
				const hashedToken = await tokenHash(token);
	
				if (capability === "read") {
					await workspaceBindings()
						.DB.prepare(
							`update workspaces
	             set read_access = 'token', read_token_hash = ?, updated_at = ?
	             where id = ?`
						)
						.bind(hashedToken, now, workspace.id)
						.run();
					const latestWorkspace = await requireWorkspace(workspace.id);
					return c.json({
						capabilities: serializeWorkspaceCapabilities(latestWorkspace),
						capability,
						links: buildReadCapabilityLinks({
							origin: new URL(c.req.url).origin,
							readToken: token,
							webOrigin: workspaceBindings().WEB_ORIGIN,
							workspaceId: workspace.id,
						}),
						workspaceId: workspace.id,
					});
				}
	
				if (workspace.write_access === "none") {
					throw new WorkspaceError(
						403,
						"write_disabled",
						"Workspace edit capability is revoked."
					);
				}
	
				await workspaceBindings()
					.DB.prepare(
						`update workspaces
	           set write_access = 'token', write_token_hash = ?, updated_at = ?
	           where id = ?`
					)
					.bind(hashedToken, now, workspace.id)
					.run();
				const latestWorkspace = await requireWorkspace(workspace.id);
				return c.json({
					capabilities: serializeWorkspaceCapabilities(latestWorkspace),
					capability,
					links: buildEditCapabilityLinks({
						editToken: token,
						webOrigin: workspaceBindings().WEB_ORIGIN,
						workspaceId: workspace.id,
					}),
					workspaceId: workspace.id,
				});
			} catch (error) {
				return handleWorkspaceError(c, error);
			}
		}
	);
	
	router.post(
		"/api/workspaces/:workspaceId/capabilities/:capability/revoke",
		async (c) => {
			try {
				const workspace = await requireWorkspace(c.req.param("workspaceId"));
				await authorizeWrite(workspace, c.req.raw);
				const capability = workspaceCapabilityKindSchema.parse(
					c.req.param("capability")
				);
				const now = new Date().toISOString();
	
				if (capability === "read") {
					await workspaceBindings()
						.DB.prepare(
							`update workspaces
	             set read_access = 'token', read_token_hash = null, updated_at = ?
	             where id = ?`
						)
						.bind(now, workspace.id)
						.run();
				} else {
					await workspaceBindings()
						.DB.prepare(
							`update workspaces
	             set write_access = 'none', write_token_hash = null, updated_at = ?
	             where id = ?`
						)
						.bind(now, workspace.id)
						.run();
				}
	
				const latestWorkspace = await requireWorkspace(workspace.id);
				return c.json({
					capabilities: serializeWorkspaceCapabilities(latestWorkspace),
					capability,
					revoked: true,
					workspaceId: workspace.id,
				});
			} catch (error) {
				return handleWorkspaceError(c, error);
			}
		}
	);
}
