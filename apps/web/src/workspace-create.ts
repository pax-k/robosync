import type { AccessMode, WriteAccessMode } from "./workspace-types";

export type WorkspaceTemplateId = "blank" | "delivery" | "review";

export interface WorkspaceTemplate {
	description: string;
	id: WorkspaceTemplateId;
	label: string;
}

export interface WorkspaceCreateFile {
	content: string;
	path: string;
}

export const WORKSPACE_TEMPLATES: WorkspaceTemplate[] = [
	{
		description: "A single README for notes, briefs, or a fresh start.",
		id: "blank",
		label: "Blank workspace",
	},
	{
		description: "A status page and a ready task for project delivery.",
		id: "delivery",
		label: "Project delivery",
	},
	{
		description: "A review task and evidence area for an investigation.",
		id: "review",
		label: "Review or investigation",
	},
];

export function createWorkspaceFiles({
	purpose,
	template,
	title,
}: {
	purpose: string;
	template: WorkspaceTemplateId;
	title: string;
}): WorkspaceCreateFile[] {
	const workspaceTitle = title.trim() || "Untitled workspace";
	const workspacePurpose = purpose.trim() || "Describe this workspace here.";
	const readme = `# ${workspaceTitle}\n\n${workspacePurpose}\n`;
	if (template === "blank") {
		return [{ content: readme, path: "README.md" }];
	}

	const status =
		"# Status\n\n## Current state\n\nReady to begin.\n\n## Next step\n\nClaim the first task.\n";
	if (template === "delivery") {
		return [
			{ content: readme, path: "README.md" },
			{ content: status, path: "STATUS.md" },
			{
				content: taskMarkdown({
					id: "START-001",
					title: "Define the first delivery milestone",
				}),
				path: "tasks/START-001.md",
			},
		];
	}

	return [
		{ content: readme, path: "README.md" },
		{ content: status, path: "STATUS.md" },
		{
			content: taskMarkdown({
				id: "REVIEW-001",
				title: "Frame the review question and evidence needed",
			}),
			path: "tasks/REVIEW-001.md",
		},
		{
			content:
				"# Evidence\n\nCollect source material here and link it from the review task.\n",
			path: "evidence/README.md",
		},
	];
}

export function createAccessDescription({
	readAccess,
	writeAccess,
}: {
	readAccess: AccessMode;
	writeAccess: WriteAccessMode;
}) {
	if (writeAccess === "public") {
		return "Anyone with the URL can read and edit this workspace.";
	}
	if (writeAccess === "none") {
		return readAccess === "public"
			? "Anyone can read. Editing is disabled."
			: "A read link is required. Editing is disabled.";
	}
	return readAccess === "public"
		? "Anyone can read. A private edit link is required to make changes."
		: "Separate private read and edit links are created.";
}

function taskMarkdown({ id, title }: { id: string; title: string }) {
	return `---\nid: ${id}\ntitle: ${title}\nstate: ready\nowner: null\n---\n\n# ${title}\n\n## Outcome\n\nDescribe the intended result.\n`;
}
