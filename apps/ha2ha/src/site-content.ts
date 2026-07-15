import { HA2HA_CONFLICT, HA2HA_PATHS } from "@ha2ha/protocol/constants";
import {
	HA2HA_V3_AUTHORITY_GRANTS,
	HA2HA_V3_CONFORMANCE_CHECKS,
	HA2HA_V3_EXAMPLE_FIXTURES,
	HA2HA_V3_FAILURE_CLASSES,
	HA2HA_V3_METHODS,
	HA2HA_V3_PARTICIPANT_KINDS,
	HA2HA_V3_PATHS,
	HA2HA_V3_PROVIDER_REFERENCE_TYPES,
	HA2HA_V3_ROLES,
} from "@ha2ha/protocol/v3-constants";

interface SiteLinks {
	github: string;
	ha2haSkill: string;
	mdsync: string;
	mdsyncSkill: string;
}

interface CapabilityGroup {
	description: string;
	label: string;
	terms: readonly string[];
}

interface FaqItem {
	answer: string;
	question: string;
}

const removeInternalVersionLabel = (value: string) =>
	value.replaceAll(".ha2ha/v3/", "").replaceAll("v3-", "");

export const SITE_LINKS: SiteLinks = {
	github: "https://github.com/pax-k/ha2ha-mdsync",
	ha2haSkill: "https://skills.sh/pax-k/ha2ha-mdsync/ha2ha",
	mdsync: "https://mdsync-web-pax.pax.workers.dev",
	mdsyncSkill: "https://skills.sh/pax-k/ha2ha-mdsync/mdsync",
};

export const NAV_ITEMS = [
	{ href: "#why", label: "Why HA2HA" },
	{ href: "#protocol", label: "Protocol" },
	{ href: "#adopt", label: "Adopt" },
	{ href: "#conformance", label: "Conformance" },
	{ href: "#mdsync", label: "MDSync" },
] as const;

export const PRINCIPLES = [
	{
		description:
			"People and agents inspect the same tasks, decisions, evidence, and handoffs as ordinary files.",
		title: "Visible shared state",
	},
	{
		description:
			"Actor attribution and version-aware writes surface conflicts instead of silently replacing another pair’s work.",
		title: "Safe concurrent work",
	},
	{
		description:
			"The workspace moves between local folders, repositories, tools, and conformant hosted implementations.",
		title: "Portable collaboration",
	},
] as const;

export const CAPABILITY_GROUPS: readonly CapabilityGroup[] = [
	{
		description:
			"Claim work, declare blockers, hand off context, request review, and complete tasks through shared records.",
		label: "Coordination",
		terms: [
			HA2HA_V3_METHODS.taskClaim,
			HA2HA_V3_METHODS.taskHandoff,
			HA2HA_V3_METHODS.taskBlock,
			HA2HA_V3_METHODS.taskComplete,
		],
	},
	{
		description:
			"Describe the humans, agents, roles, and delegated authority behind each meaningful action.",
		label: "Trust and authority",
		terms: [
			HA2HA_V3_PARTICIPANT_KINDS[2],
			HA2HA_V3_ROLES[2],
			HA2HA_V3_AUTHORITY_GRANTS[2],
			HA2HA_V3_AUTHORITY_GRANTS[3],
		],
	},
	{
		description:
			"Attach proof, ask questions, anchor review comments, and record approval against exact workspace state.",
		label: "Evidence and review",
		terms: [
			HA2HA_V3_METHODS.evidenceAdd,
			HA2HA_V3_METHODS.reviewComment,
			HA2HA_V3_METHODS.questionAsk,
			HA2HA_V3_METHODS.approvalRecord,
		],
	},
	{
		description:
			"Make policy gates, sensitive actions, exceptions, and proof of work inspectable and exportable.",
		label: "Governance and audit",
		terms: [
			removeInternalVersionLabel(HA2HA_V3_PATHS.policyGates),
			removeInternalVersionLabel(HA2HA_V3_PATHS.auditEvents),
			removeInternalVersionLabel(HA2HA_V3_PATHS.riskExceptions),
			HA2HA_V3_FAILURE_CLASSES[2],
		],
	},
	{
		description:
			"Link portable work records to the engineering artifacts that explain what changed and whether it passed.",
		label: "Engineering references",
		terms: [
			HA2HA_V3_PROVIDER_REFERENCE_TYPES[0],
			HA2HA_V3_PROVIDER_REFERENCE_TYPES[4],
			HA2HA_V3_PROVIDER_REFERENCE_TYPES[5],
			HA2HA_V3_PROVIDER_REFERENCE_TYPES[6],
		],
	},
	{
		description:
			"Validate offline, expose deterministic operations, and return shared failure classes across implementations.",
		label: "Transport and validation",
		terms: [
			HA2HA_V3_METHODS.workspaceValidate,
			HA2HA_V3_METHODS.fileUpdate,
			HA2HA_CONFLICT.error,
			HA2HA_V3_FAILURE_CLASSES[0],
		],
	},
];

export const PROTOCOL_MATURITY = [
	{
		description:
			"Portable files, actors, task state, evidence, versioned writes, and deterministic conflicts used by the current HA2HA skill and MDSync.",
		label: "Supported",
		title: "HA2HA Core 1.0",
	},
	{
		description:
			"Coordination, trust, review, governance, and engineering profiles are measurable drafts for broader implementation feedback.",
		label: "Draft",
		title: "Extended collaboration profiles",
	},
] as const;

export const WORKSPACE_TREE = [
	HA2HA_PATHS.manifestMarkdown,
	HA2HA_PATHS.status,
	HA2HA_PATHS.participants,
	HA2HA_PATHS.tasks,
	HA2HA_PATHS.evidence,
	HA2HA_PATHS.decisions,
	HA2HA_V3_PATHS.handoffs,
	HA2HA_V3_PATHS.reviews,
	HA2HA_V3_PATHS.approvals,
	HA2HA_V3_PATHS.questions,
	HA2HA_PATHS.logs,
	".ha2ha/",
] as const;

export const ADOPTION_STEPS = [
	{
		description:
			"Start with human-readable manifests, status, participants, and task records.",
		title: "Create a workspace",
	},
	{
		description:
			"Check paths, frontmatter, method contracts, and profile claims before sharing it.",
		title: "Validate the files",
	},
	{
		description:
			"Use a local client or any service that implements the same portable operations.",
		title: "Connect an implementation",
	},
	{
		description:
			"Measure transport behavior and protocol boundaries with repeatable fixtures and checks.",
		title: "Run conformance",
	},
] as const;

export const COMMANDS = [
	{
		command: "npx skills add pax-k/ha2ha-mdsync --skill ha2ha",
		label: "Portable and local workspaces",
		name: "HA2HA skill install",
	},
	{
		command: "npx skills add pax-k/ha2ha-mdsync --skill mdsync",
		label: "Hosted MDSync workspaces",
		name: "MDSync skill install",
	},
] as const;

export const CONFORMANCE_CHECKS = HA2HA_V3_CONFORMANCE_CHECKS.slice(0, 5).map(
	removeInternalVersionLabel
);

export const EXAMPLE_FIXTURES = [
	HA2HA_V3_EXAMPLE_FIXTURES[0],
	HA2HA_V3_EXAMPLE_FIXTURES[2],
	HA2HA_V3_EXAMPLE_FIXTURES[6],
	HA2HA_V3_EXAMPLE_FIXTURES[8],
	HA2HA_V3_EXAMPLE_FIXTURES[9],
	HA2HA_V3_EXAMPLE_FIXTURES[10],
].map(removeInternalVersionLabel);

export const FAILURE_CLASSES = HA2HA_V3_FAILURE_CLASSES.slice(0, 6);

export const FAQ_ITEMS: readonly FaqItem[] = [
	{
		answer:
			"No. HA2HA defines portable workspace records, operations, and conformance boundaries. A local folder can adopt the convention without running a hosted service.",
		question: "Does HA2HA require a server?",
	},
	{
		answer:
			"Yes. The contract is designed for independent tools and products. Implementations can claim only the optional profiles they support.",
		question: "Can another product implement HA2HA?",
	},
	{
		answer:
			"Mutating operations carry an actor and the version they read. A stale write returns version_conflict with the latest target instead of overwriting it.",
		question: "What happens when two pairs edit the same file?",
	},
	{
		answer:
			"No. Coordination, trust, review, governance, and engineering capabilities are independently adoptable. A simple workspace stays simple.",
		question: "Must every workspace use every capability?",
	},
	{
		answer:
			"Schemas and fixtures make file-level checks deterministic. The validator checks workspace records offline, while the conformance runner measures live HTTP behavior.",
		question: "How is an implementation validated?",
	},
	{
		answer:
			"MDSync is the first hosted implementation and measurement surface. HA2HA remains the portable standard that other products can implement.",
		question: "How does MDSync relate to HA2HA?",
	},
];
