import { Button } from "@mdsync/ui/components/button";
import { Input } from "@mdsync/ui/components/input";
import { Label } from "@mdsync/ui/components/label";
import { Textarea } from "@mdsync/ui/components/textarea";
import { ExternalLink, FileText } from "lucide-react";
import { type ChangeEvent, useCallback, useMemo, useState } from "react";
import type { CreateWorkspaceResponse } from "./workspace-types";
import { getWorkspaceIdFromPath, resolveApiBaseUrl } from "./workspace-utils";
import { WorkspaceView } from "./workspace-view";

const DEFAULT_PATH = "README.md";
const DEFAULT_CONTENT = "# MDSync workspace\n\nStart writing here.\n";

export function App() {
	const workspaceId = getWorkspaceIdFromPath();

	if (!workspaceId) {
		return <CreateWorkspaceView />;
	}

	return <WorkspaceView workspaceId={workspaceId} />;
}

function CreateWorkspaceView() {
	const apiBaseUrl = useMemo(() => resolveApiBaseUrl(), []);
	const [title, setTitle] = useState("New workspace");
	const [path, setPath] = useState(DEFAULT_PATH);
	const [content, setContent] = useState(DEFAULT_CONTENT);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleTitleChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			setTitle(event.target.value);
		},
		[]
	);
	const handlePathChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			setPath(event.target.value);
		},
		[]
	);
	const handleContentChange = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			setContent(event.target.value);
		},
		[]
	);

	const createWorkspace = useCallback(async () => {
		setBusy(true);
		setError(null);

		try {
			const response = await fetch(`${apiBaseUrl}/api/workspaces`, {
				body: JSON.stringify({
					files: [{ content, path }],
					readAccess: "token",
					title,
					writeAccess: "token",
				}),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			});

			const payload = (await response.json()) as CreateWorkspaceResponse & {
				error?: string;
				message?: string;
			};

			if (!response.ok) {
				throw new Error(payload.message ?? payload.error ?? "Create failed.");
			}

			window.location.href = payload.editUrl ?? payload.workspaceUrl;
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Create failed.");
		} finally {
			setBusy(false);
		}
	}, [apiBaseUrl, content, path, title]);

	return (
		<main className="create-screen">
			<section className="create-shell">
				<header className="topbar">
					<div>
						<p className="eyebrow">MDSync</p>
						<h1>Workspace</h1>
					</div>
					<a
						className="icon-link"
						href={apiBaseUrl}
						rel="noopener noreferrer"
						target="_blank"
					>
						<ExternalLink aria-hidden="true" size={18} />
						<span>{new URL(apiBaseUrl).host}</span>
					</a>
				</header>

				<div className="create-form">
					<Label className="field-label">
						<span>Title</span>
						<Input
							className="create-input"
							onChange={handleTitleChange}
							value={title}
						/>
					</Label>
					<Label className="field-label">
						<span>Path</span>
						<Input
							className="create-input"
							onChange={handlePathChange}
							value={path}
						/>
					</Label>
					<Label className="field-label content-field">
						<span>Markdown</span>
						<Textarea
							className="source-textarea"
							onChange={handleContentChange}
							value={content}
						/>
					</Label>
					<div className="action-row">
						<Button disabled={busy} onClick={createWorkspace} type="button">
							<FileText aria-hidden="true" size={17} />
							<span>{busy ? "Creating" : "Create"}</span>
						</Button>
					</div>
					{error ? <p className="error-text">{error}</p> : null}
				</div>
			</section>
		</main>
	);
}
