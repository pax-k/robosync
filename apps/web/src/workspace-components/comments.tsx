import { Button } from "@mdsync/ui/components/button";
import { Input } from "@mdsync/ui/components/input";
import { Label } from "@mdsync/ui/components/label";
import { Textarea } from "@mdsync/ui/components/textarea";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { type ChangeEvent, type ReactNode, useCallback } from "react";
import type {
	WorkspaceComment,
	WorkspaceFilePayload,
} from "../workspace-types";
import { formatDateTime } from "../workspace-utils";

export function CommentsPanel({
	busy,
	canEdit,
	commentDraft,
	commentLine,
	comments,
	currentVersion,
	file,
	onCommentDraftChange,
	onCommentLineChange,
	onCreateComment,
	onResolveComment,
}: {
	busy: boolean;
	canEdit: boolean;
	commentDraft: string;
	commentLine: string;
	comments: WorkspaceComment[];
	currentVersion: number | null;
	file: WorkspaceFilePayload | null;
	onCommentDraftChange: (value: string) => void;
	onCommentLineChange: (value: string) => void;
	onCreateComment: () => void;
	onResolveComment: (commentId: string) => void;
}) {
	const handleDraftChange = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			onCommentDraftChange(event.target.value);
		},
		[onCommentDraftChange]
	);
	const handleLineChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			onCommentLineChange(event.target.value);
		},
		[onCommentLineChange]
	);
	const unresolvedCount = comments.filter(
		(comment) => !comment.resolvedAt
	).length;
	const heading = file ? file.path : "No file selected";

	return (
		<section aria-labelledby="comments-heading" className="product-panel">
			<div className="panel-heading">
				<div>
					<p className="eyebrow">Product comments</p>
					<h3 id="comments-heading">{heading}</h3>
				</div>
				<div className="panel-stat">
					<span>{unresolvedCount}</span>
					<strong>open</strong>
				</div>
			</div>
			<div className="comments-layout">
				<section aria-label="Comments" className="comment-list">
					{comments.length === 0 ? (
						<p className="empty-copy">No comments are anchored to this file.</p>
					) : (
						comments.map((comment) => (
							<CommentItem
								canEdit={canEdit}
								comment={comment}
								currentVersion={currentVersion}
								key={comment.id}
								onResolveComment={onResolveComment}
							/>
						))
					)}
				</section>
				<section aria-label="Add comment" className="comment-composer">
					<h4>Add comment</h4>
					{canEdit && file ? (
						<>
							<p>
								New comments anchor to <strong>{file.path}</strong> at version{" "}
								<strong>{file.version}</strong>.
							</p>
							<Label className="field-label">
								<span>Line</span>
								<Input
									className="create-input"
									inputMode="numeric"
									onChange={handleLineChange}
									placeholder="Optional"
									value={commentLine}
								/>
							</Label>
							<Label className="field-label">
								<span>Comment</span>
								<Textarea
									className="comment-textarea"
									onChange={handleDraftChange}
									placeholder="Leave a version-pinned note"
									value={commentDraft}
								/>
							</Label>
							<Button
								disabled={busy || !commentDraft.trim()}
								onClick={onCreateComment}
								type="button"
							>
								<MessageSquare aria-hidden="true" size={16} />
								<span>Add comment</span>
							</Button>
						</>
					) : (
						<p className="empty-copy">
							Open this workspace with an edit link to add or resolve comments.
						</p>
					)}
				</section>
			</div>
		</section>
	);
}

function CommentItem({
	canEdit,
	comment,
	currentVersion,
	onResolveComment,
}: {
	canEdit: boolean;
	comment: WorkspaceComment;
	currentVersion: number | null;
	onResolveComment: (commentId: string) => void;
}) {
	const resolve = useCallback(() => {
		onResolveComment(comment.id);
	}, [comment.id, onResolveComment]);
	const isResolved = Boolean(comment.resolvedAt);
	const hasMoved =
		currentVersion !== null &&
		comment.version !== currentVersion &&
		!isResolved;
	let resolutionAction: ReactNode = null;
	if (isResolved) {
		resolutionAction = (
			<p className="resolved-copy">
				Resolved by {comment.resolvedBy ?? "unknown"}.
			</p>
		);
	} else if (canEdit) {
		resolutionAction = (
			<Button onClick={resolve} type="button" variant="outline">
				<CheckCircle2 aria-hidden="true" size={16} />
				<span>Resolve</span>
			</Button>
		);
	}

	return (
		<article className={isResolved ? "comment-card resolved" : "comment-card"}>
			<header>
				<div className="comment-card-heading">
					<strong>{comment.authorId ?? "unknown author"}</strong>
					<time className="comment-time" dateTime={comment.createdAt}>
						{formatDateTime(comment.createdAt)}
					</time>
				</div>
				<span className={isResolved ? "status-pill resolved" : "status-pill"}>
					{isResolved ? "Resolved" : "Open"}
				</span>
			</header>
			<p>{comment.body}</p>
			<div className="comment-meta">
				<span>Anchored to v{comment.version}</span>
				{currentVersion === null ? null : (
					<span>Current v{currentVersion}</span>
				)}
				{comment.anchor.line ? <span>Line {comment.anchor.line}</span> : null}
				{comment.anchor.heading ? (
					<span>Heading {comment.anchor.heading}</span>
				) : null}
			</div>
			{hasMoved ? (
				<p className="anchor-warning">
					The file changed after this comment was anchored.
				</p>
			) : null}
			{resolutionAction}
		</article>
	);
}
