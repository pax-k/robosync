import { Button } from "@mdsync/ui/components/button";
import { Input } from "@mdsync/ui/components/input";
import { Label } from "@mdsync/ui/components/label";
import { Textarea } from "@mdsync/ui/components/textarea";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { type ChangeEvent, useCallback, useMemo, useState } from "react";
import { useConfirmation } from "./confirmation";
import {
	createAccessDescription,
	createWorkspaceFiles,
	WORKSPACE_TEMPLATES,
	type WorkspaceTemplateId,
} from "./workspace-create";
import type {
	AccessMode,
	CreateWorkspaceResponse,
	WriteAccessMode,
} from "./workspace-types";
import { resolveApiBaseUrl } from "./workspace-utils";

const LAST_STEP = 3;
export const CREATED_LINKS_STORAGE_PREFIX = "mdsync-created-links:";

export function CreateWorkspacePage() {
	const apiBaseUrl = useMemo(() => resolveApiBaseUrl(), []);
	const confirm = useConfirmation();
	const [step, setStep] = useState(1);
	const [template, setTemplate] = useState<WorkspaceTemplateId>("delivery");
	const [title, setTitle] = useState("");
	const [purpose, setPurpose] = useState("");
	const [readAccess, setReadAccess] = useState<AccessMode>("token");
	const [writeAccess, setWriteAccess] = useState<WriteAccessMode>("token");
	const [advanced, setAdvanced] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const next = useCallback(() => {
		setStep((current) => Math.min(LAST_STEP, current + 1));
	}, []);
	const previous = useCallback(() => {
		setStep((current) => Math.max(1, current - 1));
	}, []);
	const handleTitle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setTitle(event.target.value);
	}, []);
	const handlePurpose = useCallback(
		(event: ChangeEvent<HTMLTextAreaElement>) => {
			setPurpose(event.target.value);
		},
		[]
	);
	const handleTemplate = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setTemplate(event.target.value as WorkspaceTemplateId);
	}, []);
	const toggleAdvanced = useCallback(() => {
		setAdvanced((value) => !value);
	}, []);
	const handleReadAccess = useCallback(
		(event: ChangeEvent<HTMLSelectElement>) => {
			setReadAccess(event.target.value as AccessMode);
		},
		[]
	);
	const handleWriteAccess = useCallback(
		(event: ChangeEvent<HTMLSelectElement>) => {
			setWriteAccess(event.target.value as WriteAccessMode);
		},
		[]
	);

	const createWorkspace = useCallback(async () => {
		if (!title.trim()) {
			setError("Give the workspace a title before creating it.");
			setStep(2);
			return;
		}
		if (
			writeAccess === "public" &&
			!(await confirm({
				confirmLabel: "Create public workspace",
				description:
					"Anyone with the URL will be able to change this workspace.",
				destructive: true,
				title: "Allow public editing?",
			}))
		) {
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const response = await fetch(`${apiBaseUrl}/api/workspaces`, {
				body: JSON.stringify({
					files: createWorkspaceFiles({ purpose, template, title }),
					readAccess,
					title: title.trim(),
					writeAccess,
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
			sessionStorage.setItem(
				`${CREATED_LINKS_STORAGE_PREFIX}${payload.id}`,
				JSON.stringify({
					editUrl: payload.editUrl,
					workspaceUrl: payload.workspaceUrl,
				})
			);
			window.location.assign(payload.editUrl ?? payload.workspaceUrl);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Create failed.");
			setBusy(false);
		}
	}, [apiBaseUrl, confirm, purpose, readAccess, template, title, writeAccess]);

	return (
		<main className="create-screen">
			<section className="create-shell">
				<header className="create-header">
					<a className="wordmark" href="/">
						<span aria-hidden="true" className="wordmark-mark">
							M
						</span>
						<span>MDSync</span>
					</a>
					<span className="create-step-label">
						Step {step} of {LAST_STEP}
					</span>
				</header>
				<div
					aria-label="Creation progress"
					className="step-progress"
					role="progressbar"
				>
					{[1, 2, 3].map((item) => (
						<span className={item <= step ? "complete" : ""} key={item} />
					))}
				</div>

				{step === 1 ? (
					<section aria-labelledby="template-heading" className="create-stage">
						<div className="stage-heading">
							<p className="eyebrow">Start with structure</p>
							<h1 id="template-heading">What kind of work is this?</h1>
							<p>
								Choose a lightweight starting point. Every file stays ordinary
								Markdown.
							</p>
						</div>
						<div className="template-grid">
							{WORKSPACE_TEMPLATES.map((item) => (
								<Label
									className={
										template === item.id
											? "template-card selected"
											: "template-card"
									}
									key={item.id}
								>
									<input
										checked={template === item.id}
										name="template"
										onChange={handleTemplate}
										type="radio"
										value={item.id}
									/>
									<span className="template-check">
										<Check aria-hidden="true" size={15} />
									</span>
									<strong>{item.label}</strong>
									<span>{item.description}</span>
								</Label>
							))}
						</div>
					</section>
				) : null}

				{step === 2 ? (
					<section
						aria-labelledby="details-heading"
						className="create-stage narrow-stage"
					>
						<div className="stage-heading">
							<p className="eyebrow">Name the outcome</p>
							<h1 id="details-heading">Give the workspace a clear purpose.</h1>
							<p>
								This becomes the opening context for people and technical tools.
							</p>
						</div>
						<Label className="field-label">
							<span>Workspace title</span>
							<Input
								autoFocus
								onChange={handleTitle}
								placeholder="Q3 launch readiness"
								value={title}
							/>
						</Label>
						<Label className="field-label">
							<span>Purpose</span>
							<Textarea
								onChange={handlePurpose}
								placeholder="Coordinate the launch plan, review evidence, and keep decisions durable."
								value={purpose}
							/>
						</Label>
					</section>
				) : null}

				{step === 3 ? (
					<section
						aria-labelledby="access-heading"
						className="create-stage narrow-stage"
					>
						<div className="stage-heading">
							<p className="eyebrow">Access</p>
							<h1 id="access-heading">Share deliberately.</h1>
							<p>Private read and edit links are the safest default.</p>
						</div>
						<div className="access-summary">
							<ShieldCheck aria-hidden="true" size={22} />
							<div>
								<strong>Token-protected links</strong>
								<span>
									{createAccessDescription({ readAccess, writeAccess })}
								</span>
							</div>
						</div>
						<Button onClick={toggleAdvanced} type="button" variant="ghost">
							{advanced ? "Hide advanced access" : "Advanced access options"}
						</Button>
						{advanced ? (
							<div className="advanced-access">
								<Label className="field-label">
									<span>Reading</span>
									<select onChange={handleReadAccess} value={readAccess}>
										<option value="token">Private read link</option>
										<option value="public">Public view</option>
									</select>
								</Label>
								<Label className="field-label">
									<span>Editing</span>
									<select onChange={handleWriteAccess} value={writeAccess}>
										<option value="token">Private edit link</option>
										<option value="none">View only</option>
										<option value="public">Public edit</option>
									</select>
								</Label>
								{writeAccess === "public" ? (
									<p className="attention-note">
										Public edit lets anyone with the URL change files. You will
										confirm this choice before creation.
									</p>
								) : null}
							</div>
						) : null}
					</section>
				) : null}

				{error ? (
					<p className="error-banner" role="alert">
						{error}
					</p>
				) : null}
				<footer className="create-actions">
					<Button
						disabled={step === 1 || busy}
						onClick={previous}
						type="button"
						variant="ghost"
					>
						<ArrowLeft aria-hidden="true" />
						Back
					</Button>
					{step < LAST_STEP ? (
						<Button
							disabled={step === 2 && !title.trim()}
							onClick={next}
							type="button"
						>
							Continue
							<ArrowRight aria-hidden="true" />
						</Button>
					) : (
						<Button disabled={busy} onClick={createWorkspace} type="button">
							{busy ? "Creating…" : "Create workspace"}
						</Button>
					)}
				</footer>
			</section>
		</main>
	);
}
