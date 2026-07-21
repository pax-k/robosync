import assert from "node:assert/strict";
import {
	mkdtemp,
	readdir,
	readFile,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	basePrompt,
	installSkills,
	runAgent,
	writeCapabilityFile,
	writePublisherDriver,
} from "./lib/mdsync-live-agent.mjs";
import {
	API_ORIGIN,
	findCapabilityLeaks,
	parseCapabilityUrl,
	parseTask,
	RELEASE_COMMIT,
	RELEASE_TAG,
	readAllWorkspaceText,
	readFile as readWorkspaceFile,
	verifyDiscovery,
	WEB_ORIGIN,
	workspaceRequest,
} from "./lib/mdsync-live-api.mjs";
import { writeRoleDriver } from "./lib/mdsync-live-drivers.mjs";
import { writeEvidence } from "./lib/mdsync-live-evidence.mjs";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");
const EVIDENCE_DIR = path.join(ROOT_DIR, "docs", "v2", "evidence");
const ROLES = [
	"publisher",
	"viewer",
	"builder-a",
	"builder-b",
	"racer-a",
	"racer-b",
	"reviewer",
	"protocol-auditor",
];
const capabilityFiles = new Set(["capability.json", "publisher-handoff.json"]);
const CLAIM_VERSION_PATTERN = /version:\s*2\b/u;
const RACE_BARRIER_TIMEOUT_MS = 4 * 60 * 1000;

const publisherPrompt = `${basePrompt({ role: "publisher", skill: "mdsync" })}
Audit the provided publisher-once.mjs against the installed skill: it must discover through the canonical Web well-known route, require matching canonical origins, create exactly the three valid HA2HA tasks, and use token read/write access with actor live-publisher. Do not edit it and do not make any direct production request. Run exactly: node publisher-once.mjs. The atomic guard makes every second execution fail, so do not retry. Verify publisher-handoff.json exists with mode 0600 without reading or printing its contents. Do not include capability values in your final JSON. Result must be workspace-created.
`;

const driverPrompt = ({
	expectedResult,
	role,
	skill = "mdsync",
}) => `${basePrompt({ role, skill })}
Audit role-once.mjs against the installed skill and the requested ${role} responsibility. The driver is capability-free source generated inside this isolated repository. Do not edit it, create another script, or make direct production requests. Run exactly: node role-once.mjs. Then read only role-result.json, require outcome pass and a result matching this expected classification: ${expectedResult}. Return the sanitized role-result fields unchanged in your final structured JSON.
`;

const waitForFiles = async (files, timeoutMs = RACE_BARRIER_TIMEOUT_MS) => {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		// biome-ignore lint/performance/noAwaitInLoops: bounded external-agent barrier
		const found = await Promise.all(
			files.map((file) =>
				stat(file)
					.then(() => true)
					.catch(() => false)
			)
		);
		if (found.every(Boolean)) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	throw new Error("Racers did not reach the barrier.");
};

const collectFiles = async (directory) => {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => {
			if (entry.name === ".git") {
				return [];
			}
			const target = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				return collectFiles(target);
			}
			return [target];
		})
	);
	return files.flat();
};

const scanAgentArtifacts = async ({ agentResults, directories, secrets }) => {
	const values = [];
	for (const result of agentResults) {
		values.push({ label: `${result.role}:stdout`, text: result.stdout });
		values.push({ label: `${result.role}:stderr`, text: result.stderr });
		values.push({
			label: `${result.role}:last-message`,
			text: result.lastMessage,
		});
		for (const forbidden of [
			ROOT_DIR,
			"packages/mdsync-client",
			"mdsync-codex-role",
			"mdsync-codex-dogfood",
		]) {
			assert.ok(
				!result.stdout.includes(forbidden),
				`${result.role} referenced forbidden ${forbidden}.`
			);
		}
	}
	const artifactFiles = (
		await Promise.all([...directories.values()].map(collectFiles))
	).flat();
	const artifactValues = await Promise.all(
		artifactFiles
			.filter((file) => !capabilityFiles.has(path.basename(file)))
			.map(async (file) => ({
				label: file,
				text: await readFile(file, "utf8"),
			}))
	);
	values.push(...artifactValues);
	const leaks = findCapabilityLeaks(values, secrets);
	assert.deepEqual(leaks, [], `Capability leaks found: ${leaks.join(", ")}`);
	return values;
};

const verifyWorkspace = async ({ editToken, viewerToken, workspaceId }) => {
	const verification = [];
	const manifestFile = await readWorkspaceFile({
		path: ".ha2ha/workspace.json",
		token: viewerToken,
		workspaceId,
	});
	const manifest = JSON.parse(manifestFile.content);
	assert.equal(manifest.protocol, "ha2ha");
	assert.equal(manifest.protocolVersion, "1.0.0");
	assert.equal(manifest.conflictPolicy, "baseVersion-required");
	assert.equal(manifest.workspaceId, workspaceId);
	verification.push(
		"Discovery origins agree and the manifest is HA2HA 1.0.0 with baseVersion-required."
	);

	await Promise.all(
		[
			["LIVE-001", "live-builder-a"],
			["LIVE-002", "live-builder-b"],
		].map(async ([taskId, actor]) => {
			const file = await readWorkspaceFile({
				path: `tasks/${taskId}.md`,
				token: viewerToken,
				workspaceId,
			});
			const task = parseTask(file.content);
			assert.equal(task.state, "done");
			assert.equal(task.owner, actor);
			assert.equal(task.updatedBy, actor);
			assert.equal(task.evidence.length, 1);
			const evidence = await readWorkspaceFile({
				path: task.evidence[0],
				token: viewerToken,
				workspaceId,
			});
			assert.match(evidence.content, new RegExp(`actor: ${actor}`, "u"));
			assert.match(
				evidence.content,
				new RegExp(`path: tasks/${taskId}\\.md`, "u")
			);
			assert.match(evidence.content, CLAIM_VERSION_PATTERN);
			assert.ok(file.version >= 3);
		})
	);
	verification.push(
		"Builders completed independent tasks with stable actors, preserved adjacent state, and linked evidence targeting claim version 2."
	);

	const race = await readWorkspaceFile({
		path: "tasks/LIVE-RACE.md",
		token: viewerToken,
		workspaceId,
	});
	const raceTask = parseTask(race.content);
	assert.equal(race.version, 2);
	assert.ok(["live-racer-a", "live-racer-b"].includes(raceTask.owner));
	const versions = await workspaceRequest({
		path: "/files/versions?path=tasks%2FLIVE-RACE.md",
		readToken: viewerToken,
		workspaceId,
	});
	assert.equal(versions.status, 200);
	assert.deepEqual(
		versions.data.versions.map((item) => item.version).sort(),
		[1, 2]
	);
	const historical = await workspaceRequest({
		path: "/files/versions/1?path=tasks%2FLIVE-RACE.md",
		readToken: viewerToken,
		workspaceId,
	});
	assert.equal(historical.status, 200);
	assert.equal(parseTask(historical.data.content).owner, null);
	verification.push(
		"The synchronized race produced one version-2 owner, preserved the losing conflict, and retained version-1 history."
	);

	const comments = await workspaceRequest({
		path: "/comments",
		readToken: viewerToken,
		workspaceId,
	});
	assert.equal(comments.status, 200);
	assert.equal(comments.data.comments.length, 1);
	assert.ok(comments.data.comments[0].resolvedAt);
	const activity = await workspaceRequest({
		path: "/activity",
		readToken: viewerToken,
		workspaceId,
	});
	assert.equal(activity.status, 200);
	const activityText = JSON.stringify(activity.data);
	assert.ok(activityText.includes("comment.created"));
	assert.ok(activityText.includes("comment.resolved"));
	const events = await workspaceRequest({
		path: "/events",
		readToken: viewerToken,
		workspaceId,
	});
	assert.equal(events.status, 200);
	const eventText = JSON.stringify(events.data);
	assert.ok(!eventText.includes("comment.created"));
	assert.ok(!eventText.includes("comment.resolved"));
	verification.push(
		"The anchored comment lifecycle appears in product activity and remains absent from portable HA2HA events."
	);

	const revoke = await workspaceRequest({
		method: "POST",
		path: "/capabilities/edit/revoke",
		token: editToken,
		workspaceId,
	});
	assert.equal(revoke.status, 200, `Edit revocation failed: ${revoke.status}`);
	const denied = await workspaceRequest({
		body: {
			actor: "post-revoke-check",
			baseVersion: null,
			content: "denied\n",
			path: "logs/post-revoke.md",
		},
		method: "PUT",
		path: "/files",
		token: editToken,
		workspaceId,
	});
	assert.ok(
		[401, 403].includes(denied.status),
		`Revoked edit unexpectedly returned ${denied.status}.`
	);
	const viewerRead = await readWorkspaceFile({
		path: "STATUS.md",
		token: viewerToken,
		workspaceId,
	});
	assert.ok(viewerRead.content.length > 0);
	verification.push(
		"Viewer mutation was denied; the edit capability was revoked and denied while Viewer reads remained available."
	);
	return { activity, comments, events, verification };
};

const main = async () => {
	const temporaryRoot = await mkdtemp(
		path.join(os.tmpdir(), "mdsync-live-skills-")
	);
	const directories = new Map(
		ROLES.map((role) => [role, path.join(temporaryRoot, role)])
	);
	const agentResults = [];
	let editToken = null;
	let viewerToken = null;
	let viewerUrl = null;
	let workspaceId = null;
	try {
		const discovery = await verifyDiscovery();
		await Promise.all(
			ROLES.slice(0, 2).map((role) => installSkills(directories.get(role)))
		);
		await Promise.all(
			ROLES.slice(2, 4).map((role) => installSkills(directories.get(role)))
		);
		await Promise.all(
			ROLES.slice(4, 6).map((role) => installSkills(directories.get(role)))
		);
		await Promise.all(
			ROLES.slice(6, 8).map((role) => installSkills(directories.get(role)))
		);
		await writePublisherDriver(directories.get("publisher"));
		await Promise.all([
			writeRoleDriver(directories.get("viewer"), {
				actor: "live-viewer",
				expectedResult: "viewer-read-mutation-denied",
				role: "viewer",
			}),
			writeRoleDriver(directories.get("builder-a"), {
				actor: "live-builder-a",
				expectedResult: "independent-task-complete",
				role: "builder-a",
				taskId: "LIVE-001",
			}),
			writeRoleDriver(directories.get("builder-b"), {
				actor: "live-builder-b",
				expectedResult: "independent-task-complete",
				role: "builder-b",
				taskId: "LIVE-002",
				updateStatus: true,
			}),
			writeRoleDriver(directories.get("racer-a"), {
				actor: "live-racer-a",
				expectedResult: "race-pending",
				role: "racer-a",
			}),
			writeRoleDriver(directories.get("racer-b"), {
				actor: "live-racer-b",
				expectedResult: "race-pending",
				role: "racer-b",
			}),
			writeRoleDriver(directories.get("reviewer"), {
				actor: "live-reviewer",
				expectedResult: "comment-lifecycle-product-only",
				role: "reviewer",
			}),
			writeRoleDriver(directories.get("protocol-auditor"), {
				actor: "live-protocol-auditor",
				expectedResult: "portable-protocol-valid",
				role: "protocol-auditor",
			}),
		]);

		const publisher = await runAgent({
			directory: directories.get("publisher"),
			prompt: publisherPrompt,
			role: "publisher",
		});
		agentResults.push(publisher);
		const handoffPath = path.join(
			directories.get("publisher"),
			"publisher-handoff.json"
		);
		assert.equal((await stat(handoffPath)).mode % 512, 0o600);
		const handoff = JSON.parse(await readFile(handoffPath, "utf8"));
		const viewer = parseCapabilityUrl(handoff.viewerUrl, "k");
		const collaborator = parseCapabilityUrl(handoff.collaboratorUrl, "edit");
		assert.equal(viewer.workspaceId, collaborator.workspaceId);
		assert.equal(viewer.workspaceId, handoff.workspaceId);
		({ viewerUrl } = handoff);
		viewerToken = viewer.token;
		editToken = collaborator.token;
		({ workspaceId } = viewer);

		await writeCapabilityFile(directories.get("viewer"), { viewerUrl });
		const viewerResult = await runAgent({
			directory: directories.get("viewer"),
			prompt: driverPrompt({
				expectedResult: "viewer-read-mutation-denied",
				role: "viewer",
			}),
			role: "viewer",
		});
		agentResults.push(viewerResult);

		await Promise.all(
			["builder-a", "builder-b", "racer-a", "racer-b", "reviewer"].map((role) =>
				writeCapabilityFile(directories.get(role), {
					collaboratorUrl: handoff.collaboratorUrl,
				})
			)
		);
		await writeCapabilityFile(directories.get("protocol-auditor"), {
			viewerUrl,
		});

		const builders = await Promise.all([
			runAgent({
				directory: directories.get("builder-a"),
				prompt: driverPrompt({
					expectedResult: "independent-task-complete",
					role: "builder-a",
				}),
				role: "builder-a",
			}),
			runAgent({
				directory: directories.get("builder-b"),
				prompt: driverPrompt({
					expectedResult: "independent-task-complete",
					role: "builder-b",
				}),
				role: "builder-b",
			}),
		]);
		agentResults.push(...builders);

		const racerPromises = [
			runAgent({
				directory: directories.get("racer-a"),
				prompt: driverPrompt({
					expectedResult: "race-winner or race-conflict-preserved",
					role: "racer-a",
				}),
				role: "racer-a",
			}),
			runAgent({
				directory: directories.get("racer-b"),
				prompt: driverPrompt({
					expectedResult: "race-winner or race-conflict-preserved",
					role: "racer-b",
				}),
				role: "racer-b",
			}),
		];
		try {
			await waitForFiles([
				path.join(directories.get("racer-a"), "race-ready.json"),
				path.join(directories.get("racer-b"), "race-ready.json"),
			]);
		} catch (error) {
			await Promise.allSettled(racerPromises);
			throw error;
		}
		await Promise.all([
			writeFile(path.join(directories.get("racer-a"), "race-go"), "go\n"),
			writeFile(path.join(directories.get("racer-b"), "race-go"), "go\n"),
		]);
		const racers = await Promise.all(racerPromises);
		assert.deepEqual(racers.map((item) => item.parsed.result).sort(), [
			"race-conflict-preserved",
			"race-winner",
		]);
		agentResults.push(...racers);

		const reviewer = await runAgent({
			directory: directories.get("reviewer"),
			prompt: driverPrompt({
				expectedResult: "comment-lifecycle-product-only",
				role: "reviewer",
			}),
			role: "reviewer",
		});
		agentResults.push(reviewer);
		const auditor = await runAgent({
			directory: directories.get("protocol-auditor"),
			prompt: driverPrompt({
				expectedResult: "portable-protocol-valid",
				role: "protocol-auditor",
				skill: "ha2ha",
			}),
			role: "protocol-auditor",
		});
		agentResults.push(auditor);

		const workspaceFiles = await readAllWorkspaceText({
			token: viewerToken,
			workspaceId,
		});
		const preRevoke = await Promise.all([
			workspaceRequest({
				path: "/comments",
				readToken: viewerToken,
				workspaceId,
			}),
			workspaceRequest({
				path: "/activity",
				readToken: viewerToken,
				workspaceId,
			}),
			workspaceRequest({
				path: "/events",
				readToken: viewerToken,
				workspaceId,
			}),
		]);
		const hostedLeaks = findCapabilityLeaks(
			[
				...workspaceFiles.map((file) => ({
					label: `workspace:${file.path}`,
					text: file.content,
				})),
				...preRevoke.map((item, index) => ({
					label: `hosted:${index}`,
					text: JSON.stringify(item.data),
				})),
			],
			[viewerUrl, handoff.collaboratorUrl, viewerToken, editToken]
		);
		assert.deepEqual(hostedLeaks, []);
		await scanAgentArtifacts({
			agentResults,
			directories,
			secrets: [viewerUrl, handoff.collaboratorUrl, viewerToken, editToken],
		});

		const verified = await verifyWorkspace({
			editToken,
			viewerToken,
			workspaceId,
		});
		const evidence = {
			agents: agentResults.map(({ parsed }) => ({
				outcome: parsed.outcome,
				result: parsed.result,
				role: parsed.role,
			})),
			apiOrigin: API_ORIGIN,
			command: "pnpm run test:mdsync-live-skills",
			discovery: {
				apiOrigin: discovery.apiOrigin,
				webOrigin: discovery.webOrigin,
			},
			outcome: "pass",
			release: { commit: RELEASE_COMMIT, tag: RELEASE_TAG },
			retainedWorkspace: {
				editCapabilityRevoked: true,
				viewerReadable: true,
				workspaceId,
			},
			security: {
				capabilityLeak: false,
				forbiddenRepositoryReference: false,
				handoffFileMode: "0600",
				roleExecution:
					"generated capability-free one-shot drivers audited by isolated Codex agents",
			},
			timestamp: new Date().toISOString(),
			verification: verified.verification,
			webOrigin: WEB_ORIGIN,
		};
		const serializedEvidence = JSON.stringify(evidence);
		assert.deepEqual(
			findCapabilityLeaks(
				[{ label: "evidence", text: serializedEvidence }],
				[viewerUrl, handoff.collaboratorUrl, viewerToken, editToken]
			),
			[]
		);
		await writeEvidence({ evidence, outputDirectory: EVIDENCE_DIR });
		process.stdout.write(`LIVE_MDSYNC_VIEWER_URL=${viewerUrl}\n`);
	} catch (error) {
		if (!(editToken && workspaceId)) {
			const recovered = await readFile(
				path.join(directories.get("publisher"), "publisher-handoff.json"),
				"utf8"
			)
				.then((text) => JSON.parse(text))
				.catch(() => null);
			if (recovered?.collaboratorUrl) {
				const capability = parseCapabilityUrl(
					recovered.collaboratorUrl,
					"edit"
				);
				editToken = capability.token;
				({ workspaceId } = capability);
			}
		}
		if (editToken && workspaceId) {
			await workspaceRequest({
				method: "POST",
				path: "/capabilities/edit/revoke",
				token: editToken,
				workspaceId,
			}).catch(() => undefined);
		}
		throw error;
	} finally {
		await rm(temporaryRoot, { force: true, recursive: true });
	}
};

await main();
