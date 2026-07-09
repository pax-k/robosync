import {
	mkdir,
	readdir,
	readFile,
	stat,
	unlink,
	writeFile,
} from "node:fs/promises";
import path from "node:path";
import {
	HA2HA_EVENT_TYPES,
	HA2HA_PATHS,
	ha2haWorkspaceManifestSchema,
	validateHa2haWorkspace,
} from "@ha2ha/protocol";
import {
	conflictFromFile,
	contentTypeForPath,
	err,
	errFromClientError,
	isNodeError,
	ok,
	sha256,
	validateWorkspacePath,
} from "../shared";
import type { Ha2haFile, Ha2haResult, Ha2haTransport } from "../types";

const JSON_INDENT_SPACES = 2;

export interface CreateLocalFolderTransportOptions {
	rootDir: string;
	workspaceId?: string;
}

interface LocalFileVersion {
	contentType: string;
	createdAt: string;
	path: string;
	sha256: string;
	sizeBytes: number;
	updatedBy: string;
	version: number;
	workspaceId: string;
}

interface LocalEvent {
	actor: string;
	createdAt?: string;
	id?: string;
	path: string;
	payload: Record<string, unknown>;
	type: string;
	version: number;
	workspaceId: string;
}

export const createLocalFolderTransport = ({
	rootDir,
	workspaceId,
}: CreateLocalFolderTransportOptions): Ha2haTransport => {
	const absoluteRoot = path.resolve(rootDir);

	const resolveWorkspaceId = async (): Promise<string> => {
		if (workspaceId) {
			return workspaceId;
		}
		const manifest = await readManifest(absoluteRoot);
		return manifest.workspaceId;
	};

	return {
		deleteFile: async ({ actor, baseVersion, path: filePath }) => {
			const pathError = validateWorkspacePath(filePath);
			if (pathError) {
				return errFromClientError(pathError);
			}
			const targetPath = path.join(absoluteRoot, filePath);
			const current = await readLocalCurrentFile({
				absoluteRoot,
				filePath,
				workspaceId: await resolveWorkspaceId(),
			});
			if (!current.ok) {
				return current;
			}
			if (baseVersion !== current.data.version) {
				return conflictFromFile(current.data);
			}
			await unlink(targetPath);
			await appendEvent(absoluteRoot, {
				actor,
				path: filePath,
				payload: { baseVersion },
				type: HA2HA_EVENT_TYPES.fileDeleted,
				version: current.data.version,
				workspaceId: current.data.workspaceId,
			});
			return ok({
				deleted: true,
				deletedBy: actor,
				path: filePath,
				workspaceId: current.data.workspaceId,
			});
		},
		listWorkspace: async () => {
			const resolvedWorkspaceId = await resolveWorkspaceId();
			const files = await listLocalFiles(absoluteRoot);
			const versions = await readFileVersions(absoluteRoot);
			return ok({
				files: files.map((filePath) => ({
					path: filePath,
					version: latestVersionForPath(versions, filePath) ?? 1,
				})),
				workspaceId: resolvedWorkspaceId,
			});
		},
		readFile: async (filePath) =>
			readLocalCurrentFile({
				absoluteRoot,
				filePath,
				workspaceId: await resolveWorkspaceId(),
			}),
		validateWorkspace: async () =>
			ok(await validateHa2haWorkspace(absoluteRoot)),
		writeFile: async ({
			actor,
			baseVersion,
			content,
			contentType,
			path: filePath,
		}) => {
			const pathError = validateWorkspacePath(filePath);
			if (pathError) {
				return errFromClientError(pathError);
			}
			const resolvedWorkspaceId = await resolveWorkspaceId();
			const targetPath = path.join(absoluteRoot, filePath);
			const existing = await readLocalCurrentFile({
				absoluteRoot,
				filePath,
				workspaceId: resolvedWorkspaceId,
			});
			if (existing.ok && baseVersion !== existing.data.version) {
				return conflictFromFile(existing.data);
			}
			if (!(existing.ok || baseVersion === null || baseVersion === undefined)) {
				return err(
					"version_conflict",
					"Cannot create a missing file with a baseVersion.",
					{
						latest: {
							path: filePath,
							version: 0,
							workspaceId: resolvedWorkspaceId,
						},
					}
				);
			}
			const nextVersion = existing.ok ? existing.data.version + 1 : 1;
			await mkdir(path.dirname(targetPath), { recursive: true });
			await writeFile(targetPath, content);
			const nextContentType = contentType ?? contentTypeForPath(filePath);
			await appendFileVersion(absoluteRoot, {
				contentType: nextContentType,
				createdAt: new Date().toISOString(),
				path: filePath,
				sha256: sha256(content),
				sizeBytes: Buffer.byteLength(content),
				updatedBy: actor,
				version: nextVersion,
				workspaceId: resolvedWorkspaceId,
			});
			await appendEvent(absoluteRoot, {
				actor,
				path: filePath,
				payload: { baseVersion: baseVersion ?? null },
				type: existing.ok
					? HA2HA_EVENT_TYPES.fileUpdated
					: HA2HA_EVENT_TYPES.fileCreated,
				version: nextVersion,
				workspaceId: resolvedWorkspaceId,
			});
			return ok({
				path: filePath,
				updatedBy: actor,
				version: nextVersion,
				workspaceId: resolvedWorkspaceId,
			});
		},
	};
};

const readManifest = async (absoluteRoot: string) => {
	const manifestPath = path.join(absoluteRoot, HA2HA_PATHS.workspaceManifest);
	const json = JSON.parse(await readFile(manifestPath, "utf8"));
	return ha2haWorkspaceManifestSchema.parse(json);
};

const readLocalCurrentFile = async ({
	absoluteRoot,
	filePath,
	workspaceId,
}: {
	absoluteRoot: string;
	filePath: string;
	workspaceId: string;
}): Promise<Ha2haResult<Ha2haFile>> => {
	const pathError = validateWorkspacePath(filePath);
	if (pathError) {
		return errFromClientError(pathError);
	}
	const targetPath = path.join(absoluteRoot, filePath);
	try {
		const content = await readFile(targetPath, "utf8");
		const versions = await readFileVersions(absoluteRoot);
		const latest = latestFileVersionForPath(versions, filePath);
		return ok({
			content,
			contentType: latest?.contentType ?? contentTypeForPath(filePath),
			path: filePath,
			updatedBy: latest?.updatedBy ?? null,
			version: latest?.version ?? 1,
			workspaceId,
		});
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") {
			return err("not_found", `Missing HA2HA file ${filePath}.`);
		}
		return err(
			"transport_error",
			`Failed to read ${filePath}: ${String(error)}`
		);
	}
};

const listLocalFiles = async (
	absoluteRoot: string,
	currentDir = absoluteRoot
): Promise<string[]> => {
	const entries = await readdir(currentDir);
	const files = await Promise.all(
		entries.map(async (entry) => {
			const entryPath = path.join(currentDir, entry);
			const entryStat = await stat(entryPath);
			if (entryStat.isDirectory()) {
				return listLocalFiles(absoluteRoot, entryPath);
			}
			return [toWorkspacePath(absoluteRoot, entryPath)];
		})
	);
	return files.flat().sort((left, right) => left.localeCompare(right));
};

const readFileVersions = async (
	absoluteRoot: string
): Promise<LocalFileVersion[]> =>
	readJsonArray(path.join(absoluteRoot, ".ha2ha", "file-versions.json"));

const appendFileVersion = async (
	absoluteRoot: string,
	fileVersion: LocalFileVersion
) => {
	const versions = await readFileVersions(absoluteRoot);
	versions.push(fileVersion);
	await writeJsonArray(
		path.join(absoluteRoot, ".ha2ha", "file-versions.json"),
		versions
	);
};

const appendEvent = async (absoluteRoot: string, event: LocalEvent) => {
	const eventsPath = path.join(absoluteRoot, ".ha2ha", "workspace-events.json");
	const events = await readJsonArray<LocalEvent>(eventsPath);
	events.push({
		...event,
		createdAt: event.createdAt ?? new Date().toISOString(),
		id: event.id ?? `evt-${events.length + 1}`,
	});
	await writeJsonArray(eventsPath, events);
};

const readJsonArray = async <Item>(filePath: string): Promise<Item[]> => {
	try {
		const value = JSON.parse(await readFile(filePath, "utf8"));
		return Array.isArray(value) ? (value as Item[]) : [];
	} catch (error) {
		if (isNodeError(error) && error.code === "ENOENT") {
			return [];
		}
		throw error;
	}
};

const writeJsonArray = async (filePath: string, values: unknown[]) => {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(
		filePath,
		`${JSON.stringify(values, null, JSON_INDENT_SPACES)}\n`
	);
};

const latestFileVersionForPath = (
	versions: LocalFileVersion[],
	filePath: string
) =>
	versions
		.filter((version) => version.path === filePath)
		.sort((left, right) => right.version - left.version)[0];

const latestVersionForPath = (versions: LocalFileVersion[], filePath: string) =>
	latestFileVersionForPath(versions, filePath)?.version;

const toWorkspacePath = (absoluteRoot: string, filePath: string) =>
	path.relative(absoluteRoot, filePath).split(path.sep).join("/");
