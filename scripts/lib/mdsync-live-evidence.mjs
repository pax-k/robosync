import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const writeEvidence = async ({ evidence, outputDirectory }) => {
	await mkdir(outputDirectory, { recursive: true });
	const basename = "mdsync-live-skills-2026-07-21";
	const jsonPath = path.join(outputDirectory, `${basename}.json`);
	const markdownPath = path.join(outputDirectory, `${basename}.md`);
	await writeFile(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`);
	const roles = evidence.agents
		.map((agent) => `| ${agent.role} | ${agent.outcome} | ${agent.result} |`)
		.join("\n");
	const markdown = `# Live MDSync Skill Acceptance — 2026-07-21

## Outcome

**${evidence.outcome.toUpperCase()}** against \`${evidence.apiOrigin}\` using eight isolated \`codex exec --ephemeral\` agents and public skills pinned to \`${evidence.release.tag}\` (\`${evidence.release.commit}\`).

No capability URL or token is included in this artifact. The edit capability was revoked after verification; the Viewer capability remains readable and was returned only to the initiating user.

## Agent results

| Role | Outcome | Result |
| --- | --- | --- |
${roles}

## Independent verification

${evidence.verification.map((check) => `- ${check}`).join("\n")}

## Security

- Capability handoffs used separate mode-0600 files.
- Exact-secret and capability-pattern scans passed across agent output, temporary files, hosted files, comments, activity, events, and evidence.
- No agent command event referenced the robosync checkout, workspace packages, or repository helper scripts.
- The old edit credential was denied after revocation while Viewer reads remained successful.

## Command

\`pnpm run test:mdsync-live-skills\`
`;
	await writeFile(markdownPath, markdown);
	return { jsonPath, markdownPath };
};
