import { type Dispatch, type SetStateAction, useCallback } from "react";
import {
	postResolveWorkspaceComment,
	postWorkspaceComment,
} from "./workspace-mutations";
import type { WorkspaceComment, WorkspaceFilePayload } from "./workspace-types";

export function useWorkspaceComments({
	apiBaseUrl,
	commentDraft,
	commentLine,
	editToken,
	file,
	loadOverview,
	loadWorkspaceActivity,
	setBusy,
	setCommentDraft,
	setCommentLine,
	setComments,
	setError,
	workspaceId,
}: {
	apiBaseUrl: string;
	commentDraft: string;
	commentLine: string;
	editToken: string | null;
	file: WorkspaceFilePayload | null;
	loadOverview: () => Promise<void>;
	loadWorkspaceActivity: () => Promise<void>;
	setBusy: Dispatch<SetStateAction<boolean>>;
	setCommentDraft: Dispatch<SetStateAction<string>>;
	setCommentLine: Dispatch<SetStateAction<string>>;
	setComments: Dispatch<SetStateAction<WorkspaceComment[]>>;
	setError: Dispatch<SetStateAction<string | null>>;
	workspaceId: string;
}) {
	const createComment = useCallback(async () => {
		const trimmedBody = commentDraft.trim();
		if (!(editToken && file && trimmedBody)) {
			return;
		}

		setBusy(true);
		setError(null);
		try {
			const line = Number(commentLine);
			const selector =
				commentLine.trim() && Number.isInteger(line) && line > 0
					? { line }
					: undefined;
			const comment = await postWorkspaceComment({
				apiBaseUrl,
				body: trimmedBody,
				editToken,
				path: file.path,
				selector,
				version: file.version,
				workspaceId,
			});
			setComments((currentComments) => [...currentComments, comment]);
			setCommentDraft("");
			setCommentLine("");
			await Promise.all([loadWorkspaceActivity(), loadOverview()]);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Comment failed.");
		} finally {
			setBusy(false);
		}
	}, [
		apiBaseUrl,
		commentDraft,
		commentLine,
		editToken,
		file,
		loadOverview,
		loadWorkspaceActivity,
		setBusy,
		setCommentDraft,
		setCommentLine,
		setComments,
		setError,
		workspaceId,
	]);

	const resolveComment = useCallback(
		async (commentId: string) => {
			if (!editToken) {
				return;
			}

			setBusy(true);
			setError(null);
			try {
				const resolvedComment = await postResolveWorkspaceComment({
					apiBaseUrl,
					commentId,
					editToken,
					workspaceId,
				});
				setComments((currentComments) =>
					currentComments.map((comment) =>
						comment.id === resolvedComment.id ? resolvedComment : comment
					)
				);
				await Promise.all([loadWorkspaceActivity(), loadOverview()]);
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : "Resolve failed.");
			} finally {
				setBusy(false);
			}
		},
		[
			apiBaseUrl,
			editToken,
			loadOverview,
			loadWorkspaceActivity,
			setBusy,
			setComments,
			setError,
			workspaceId,
		]
	);

	return { createComment, resolveComment };
}
