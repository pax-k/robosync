import { HA2HA_PATHS, type Ha2haTargetCoordinate } from "@ha2ha/protocol";
import {
	formatMarkdownFrontmatter,
	parseMarkdownFrontmatter,
} from "./markdown";
import {
	DEFAULT_CONTENT_TYPE,
	err,
	getNullableString,
	ok,
	slug,
} from "./shared";
import type {
	AddEvidenceInput,
	ClaimTaskInput,
	Ha2haResult,
	Ha2haTransport,
	Ha2haWriteResult,
	RecordDecisionInput,
	TransportWriteInput,
	WriteHandoffInput,
} from "./types";

type WriteFileWithActor = (
	input: Omit<TransportWriteInput, "actor">
) => Promise<Ha2haResult<Ha2haWriteResult>>;

export const claimTask = async ({
	actor,
	input,
	transport,
	writeFileWithActor,
}: {
	actor: string;
	input: ClaimTaskInput;
	transport: Ha2haTransport;
	writeFileWithActor: WriteFileWithActor;
}): Promise<Ha2haResult<Ha2haWriteResult>> => {
	const taskPath = input.path ?? `${HA2HA_PATHS.tasks}${input.taskId}.md`;
	const task = await transport.readFile(taskPath);
	if (!task.ok) {
		return task;
	}
	const parsed = parseMarkdownFrontmatter(task.data.content);
	if (!parsed.ok) {
		return parsed;
	}
	const owner = getNullableString(parsed.data.frontmatter, "owner");
	if (owner && owner !== actor) {
		return err(
			"task_owned",
			`Task ${input.taskId} is already owned by ${owner}.`
		);
	}
	const nextFrontmatter = {
		...parsed.data.frontmatter,
		owner: input.owner ?? actor,
		state: input.state ?? "claimed",
		updated_by: actor,
	};
	return writeFileWithActor({
		baseVersion: task.data.version,
		content: formatMarkdownFrontmatter(nextFrontmatter, parsed.data.body),
		contentType: task.data.contentType,
		path: taskPath,
	});
};

export const addEvidence = async ({
	actor,
	clock,
	input,
	transport,
	writeFileWithActor,
}: {
	actor: string;
	clock: () => Date;
	input: AddEvidenceInput;
	transport: Ha2haTransport;
	writeFileWithActor: WriteFileWithActor;
}): Promise<
	Ha2haResult<{ evidence: Ha2haWriteResult; task: Ha2haWriteResult }>
> => {
	const taskPath = `${HA2HA_PATHS.tasks}${input.taskId}.md`;
	const task = await transport.readFile(taskPath);
	if (!task.ok) {
		return task;
	}
	const evidencePath =
		input.evidencePath ??
		`${HA2HA_PATHS.evidence}${input.taskId}/${slug(input.kind)}.md`;
	const target =
		input.target ??
		({
			path: taskPath,
			version: task.data.version,
			workspaceId: task.data.workspaceId,
		} satisfies Ha2haTargetCoordinate);
	const evidence = await writeFileWithActor({
		content: formatMarkdownFrontmatter(
			{
				actor,
				created_at: clock().toISOString(),
				id: input.id ?? `ev-${input.taskId}-${slug(input.kind)}`,
				kind: input.kind,
				result: input.result,
				target,
				task: input.taskId,
			},
			input.body ?? `Evidence for ${input.taskId}.`
		),
		contentType: DEFAULT_CONTENT_TYPE,
		path: evidencePath,
	});
	if (!evidence.ok) {
		return evidence;
	}
	const parsed = parseMarkdownFrontmatter(task.data.content);
	if (!parsed.ok) {
		return parsed;
	}
	const currentEvidence = Array.isArray(parsed.data.frontmatter.evidence)
		? parsed.data.frontmatter.evidence.filter(
				(value): value is string => typeof value === "string"
			)
		: [];
	const nextEvidence = currentEvidence.includes(evidencePath)
		? currentEvidence
		: [...currentEvidence, evidencePath];
	const updatedTask = await writeFileWithActor({
		baseVersion: task.data.version,
		content: formatMarkdownFrontmatter(
			{
				...parsed.data.frontmatter,
				evidence: nextEvidence,
				updated_by: actor,
			},
			parsed.data.body
		),
		contentType: task.data.contentType,
		path: taskPath,
	});
	if (!updatedTask.ok) {
		return err(
			"partial_write",
			"Evidence was written but not linked to the task.",
			{
				latest: updatedTask.error.latest,
				partial: {
					evidence: evidence.data,
					failedOperation: "link_task_evidence",
				},
				status: updatedTask.error.status,
			}
		);
	}
	return ok({ evidence: evidence.data, task: updatedTask.data });
};

export const recordDecision = async ({
	clock,
	input,
	writeFileWithActor,
}: {
	clock: () => Date;
	input: RecordDecisionInput;
	writeFileWithActor: WriteFileWithActor;
}) =>
	writeFileWithActor({
		content: `# ${input.title}\n\n${input.body.trim()}\n`,
		contentType: DEFAULT_CONTENT_TYPE,
		path:
			input.path ??
			`${HA2HA_PATHS.decisions}${clock().toISOString().slice(0, 10)}-${slug(
				input.title
			)}.md`,
	});

export const writeHandoff = async ({
	clock,
	input,
	writeFileWithActor,
}: {
	clock: () => Date;
	input: WriteHandoffInput;
	writeFileWithActor: WriteFileWithActor;
}) =>
	writeFileWithActor({
		content: `# Handoff${input.taskId ? ` For ${input.taskId}` : ""}\n\n${input.body.trim()}\n`,
		contentType: DEFAULT_CONTENT_TYPE,
		path:
			input.path ??
			`${HA2HA_PATHS.logs}${clock().toISOString().slice(0, 10)}-handoff.md`,
	});
