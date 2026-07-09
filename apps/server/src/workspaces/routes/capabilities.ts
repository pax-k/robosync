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
import {
	revokeEditCapability,
	revokeReadCapability,
	rotateEditCapability,
	rotateReadCapability,
} from "../storage";

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
					await rotateReadCapability({
						hashedToken,
						now,
						workspaceId: workspace.id,
					});
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

				await rotateEditCapability({
					hashedToken,
					now,
					workspaceId: workspace.id,
				});
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
					await revokeReadCapability({ now, workspaceId: workspace.id });
				} else {
					await revokeEditCapability({ now, workspaceId: workspace.id });
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
