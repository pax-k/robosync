import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useState,
} from "react";
import {
	importWorkspaceExport,
	loadWorkspaceAdminStats,
	loadWorkspaceCapabilities,
	loadWorkspaceExport,
	loadWorkspaceRetentionPolicy,
	responseMessage,
} from "./api/workspaces";
import type {
	CapabilityKind,
	CapabilityLinks,
	CapabilityMutationPayload,
	ViewMode,
	WorkspaceAdminStats,
	WorkspaceCapabilities,
	WorkspaceRetentionPolicy,
} from "./workspace-types";
import { downloadJsonFile, replaceWorkspaceUrl } from "./workspace-utils";

export function useWorkspaceAdmin({
	apiBaseUrl,
	editToken,
	setBusy,
	setEditToken,
	setError,
	setMode,
	tokenQuery,
	workspaceId,
}: {
	apiBaseUrl: string;
	editToken: string | null;
	setBusy: Dispatch<SetStateAction<boolean>>;
	setEditToken: Dispatch<SetStateAction<string | null>>;
	setError: Dispatch<SetStateAction<string | null>>;
	setMode: Dispatch<SetStateAction<ViewMode>>;
	tokenQuery: string;
	workspaceId: string;
}) {
	const [adminStats, setAdminStats] = useState<WorkspaceAdminStats | null>(
		null
	);
	const [capabilities, setCapabilities] =
		useState<WorkspaceCapabilities | null>(null);
	const [capabilityLinks, setCapabilityLinks] = useState<CapabilityLinks>({});
	const [capabilityNotice, setCapabilityNotice] = useState<string | null>(null);
	const [adminActionNotice, setAdminActionNotice] = useState<string | null>(
		null
	);
	const [importedWorkspaceLinks, setImportedWorkspaceLinks] =
		useState<CapabilityLinks>({});
	const [retentionPolicy, setRetentionPolicy] =
		useState<WorkspaceRetentionPolicy | null>(null);

	const loadCapabilities = useCallback(
		async (signal?: AbortSignal) => {
			if (!editToken) {
				setCapabilities(null);
				return;
			}

			const payload = await loadWorkspaceCapabilities({
				apiBaseUrl,
				signal,
				tokenQuery,
				workspaceId,
			});
			if (!signal?.aborted) {
				setCapabilities(payload.capabilities);
			}
		},
		[apiBaseUrl, editToken, tokenQuery, workspaceId]
	);

	const loadAdminStats = useCallback(
		async (signal?: AbortSignal) => {
			if (!editToken) {
				setAdminStats(null);
				return;
			}

			const stats = await loadWorkspaceAdminStats({
				apiBaseUrl,
				signal,
				tokenQuery,
				workspaceId,
			});
			if (!signal?.aborted) {
				setAdminStats(stats);
			}
		},
		[apiBaseUrl, editToken, tokenQuery, workspaceId]
	);

	const rotateCapability = useCallback(
		async (capability: CapabilityKind) => {
			if (!editToken) {
				return;
			}

			setBusy(true);
			setError(null);
			setCapabilityNotice(null);

			try {
				const response = await fetch(
					`${apiBaseUrl}/api/workspaces/${workspaceId}/capabilities/${capability}/rotate`,
					{
						headers: {
							Authorization: `Bearer ${editToken}`,
						},
						method: "POST",
					}
				);

				if (!response.ok) {
					throw new Error(await responseMessage(response));
				}

				const payload = (await response.json()) as CapabilityMutationPayload;
				setCapabilities(payload.capabilities);
				setCapabilityLinks(payload.links ?? {});
				if (capability === "edit" && payload.links?.editUrl) {
					const nextEditToken = new URL(payload.links.editUrl).searchParams.get(
						"edit"
					);
					if (nextEditToken) {
						setEditToken(nextEditToken);
						replaceWorkspaceUrl({ editToken: nextEditToken, workspaceId });
					}
				}
				setCapabilityNotice(
					capability === "read"
						? "Read link rotated."
						: "Edit link rotated and this session was updated."
				);
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : "Rotation failed.");
			} finally {
				setBusy(false);
			}
		},
		[apiBaseUrl, editToken, setBusy, setEditToken, setError, workspaceId]
	);

	const revokeCapability = useCallback(
		async (capability: CapabilityKind) => {
			if (!editToken) {
				return;
			}

			setBusy(true);
			setError(null);
			setCapabilityNotice(null);

			try {
				const response = await fetch(
					`${apiBaseUrl}/api/workspaces/${workspaceId}/capabilities/${capability}/revoke`,
					{
						headers: {
							Authorization: `Bearer ${editToken}`,
						},
						method: "POST",
					}
				);

				if (!response.ok) {
					throw new Error(await responseMessage(response));
				}

				const payload = (await response.json()) as CapabilityMutationPayload;
				setCapabilities(payload.capabilities);
				setCapabilityLinks({});
				setCapabilityNotice(
					capability === "read"
						? "Read link revoked."
						: "Edit link revoked for this workspace."
				);
				if (capability === "edit") {
					setEditToken(null);
					replaceWorkspaceUrl({ editToken: null, workspaceId });
					setMode("preview");
				}
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : "Revocation failed.");
			} finally {
				setBusy(false);
			}
		},
		[
			apiBaseUrl,
			editToken,
			setBusy,
			setEditToken,
			setError,
			setMode,
			workspaceId,
		]
	);

	const exportWorkspace = useCallback(async () => {
		if (!editToken) {
			return;
		}

		setBusy(true);
		setError(null);
		setAdminActionNotice(null);

		try {
			const bundle = await loadWorkspaceExport({
				apiBaseUrl,
				tokenQuery,
				workspaceId,
			});
			downloadJsonFile(bundle, `${workspaceId}-workspace-export.json`);
			setAdminActionNotice("Workspace export downloaded.");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Export failed.");
		} finally {
			setBusy(false);
		}
	}, [apiBaseUrl, editToken, setBusy, setError, tokenQuery, workspaceId]);

	const importWorkspace = useCallback(
		async (sourceFile: File) => {
			setBusy(true);
			setError(null);
			setAdminActionNotice(null);
			setImportedWorkspaceLinks({});

			try {
				const bundle = JSON.parse(await sourceFile.text()) as unknown;
				const imported = await importWorkspaceExport({
					apiBaseUrl,
					bundle,
				});
				setImportedWorkspaceLinks({
					editUrl: imported.editUrl,
					rawUrl: imported.rawUrl,
					workspaceUrl: imported.workspaceUrl,
				});
				setAdminActionNotice(
					`Workspace import created with ${imported.importedCounts.files} files.`
				);
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : "Import failed.");
			} finally {
				setBusy(false);
			}
		},
		[apiBaseUrl, setBusy, setError]
	);

	const loadRetentionPolicy = useCallback(async () => {
		if (!editToken) {
			return;
		}

		setBusy(true);
		setError(null);
		setAdminActionNotice(null);

		try {
			const policy = await loadWorkspaceRetentionPolicy({
				apiBaseUrl,
				tokenQuery,
				workspaceId,
			});
			setRetentionPolicy(policy);
			setAdminActionNotice("Retention policy loaded.");
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Retention policy failed."
			);
		} finally {
			setBusy(false);
		}
	}, [apiBaseUrl, editToken, setBusy, setError, tokenQuery, workspaceId]);

	return {
		adminActionNotice,
		adminStats,
		capabilities,
		capabilityLinks,
		capabilityNotice,
		exportWorkspace,
		importedWorkspaceLinks,
		importWorkspace,
		loadAdminStats,
		loadCapabilities,
		loadRetentionPolicy,
		retentionPolicy,
		revokeCapability,
		rotateCapability,
	};
}
