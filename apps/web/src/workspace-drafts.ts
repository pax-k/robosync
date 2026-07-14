export interface WorkspaceDraft {
	baseVersion: number;
	content: string;
	path: string;
	updatedAt: string;
	workspaceId: string;
}

const DATABASE_NAME = "mdsync-workspace-drafts";
const DATABASE_VERSION = 1;
const DRAFT_STORE = "drafts";
export const DRAFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export function isDraftExpired(draft: WorkspaceDraft, now = Date.now()) {
	return now - Date.parse(draft.updatedAt) >= DRAFT_EXPIRY_MS;
}

export async function getWorkspaceDraft(
	workspaceId: string,
	path: string
): Promise<WorkspaceDraft | null> {
	const database = await openDraftDatabase();
	if (!database) {
		return null;
	}
	const draft = await requestValue<WorkspaceDraft | undefined>(
		database
			.transaction(DRAFT_STORE)
			.objectStore(DRAFT_STORE)
			.get(draftKey(workspaceId, path))
	);
	database.close();
	if (!draft) {
		return null;
	}
	if (isDraftExpired(draft)) {
		await deleteWorkspaceDraft(workspaceId, path);
		return null;
	}
	return draft;
}

export async function putWorkspaceDraft(draft: WorkspaceDraft) {
	const database = await openDraftDatabase();
	if (!database) {
		return;
	}
	const transaction = database.transaction(DRAFT_STORE, "readwrite");
	transaction
		.objectStore(DRAFT_STORE)
		.put(draft, draftKey(draft.workspaceId, draft.path));
	await transactionComplete(transaction);
	database.close();
}

export async function deleteWorkspaceDraft(workspaceId: string, path: string) {
	const database = await openDraftDatabase();
	if (!database) {
		return;
	}
	const transaction = database.transaction(DRAFT_STORE, "readwrite");
	transaction.objectStore(DRAFT_STORE).delete(draftKey(workspaceId, path));
	await transactionComplete(transaction);
	database.close();
}

export async function listWorkspaceDraftPaths(workspaceId: string) {
	const database = await openDraftDatabase();
	if (!database) {
		return [];
	}
	const drafts = await requestValue<WorkspaceDraft[]>(
		database.transaction(DRAFT_STORE).objectStore(DRAFT_STORE).getAll()
	);
	database.close();
	return drafts
		.filter(
			(draft) => draft.workspaceId === workspaceId && !isDraftExpired(draft)
		)
		.map((draft) => draft.path);
}

function openDraftDatabase(): Promise<IDBDatabase | null> {
	if (typeof indexedDB === "undefined") {
		return Promise.resolve(null);
	}
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
		request.onerror = () => reject(request.error);
		request.onupgradeneeded = () => {
			if (!request.result.objectStoreNames.contains(DRAFT_STORE)) {
				request.result.createObjectStore(DRAFT_STORE);
			}
		};
		request.onsuccess = () => resolve(request.result);
	});
}

function draftKey(workspaceId: string, path: string) {
	return `${workspaceId}\u0000${path}`;
}

function requestValue<Value>(request: IDBRequest<Value>): Promise<Value> {
	return new Promise((resolve, reject) => {
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
	});
}

function transactionComplete(transaction: IDBTransaction) {
	return new Promise<void>((resolve, reject) => {
		transaction.onabort = () => reject(transaction.error);
		transaction.onerror = () => reject(transaction.error);
		transaction.oncomplete = () => resolve();
	});
}
