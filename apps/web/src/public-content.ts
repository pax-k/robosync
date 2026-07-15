export const PUBLIC_LINKS = {
	github: "https://github.com/pax-k/ha2ha-mdsync",
	ha2haDocs: "https://mdsync-ha2ha-pax.pax.workers.dev",
	ha2haSkill: "https://skills.sh/pax-k/ha2ha-mdsync/ha2ha",
	mdsyncSkill: "https://skills.sh/pax-k/ha2ha-mdsync/mdsync",
} as const;

export const MDSYNC_SKILL_INSTALL =
	"npx skills add pax-k/ha2ha-mdsync --skill mdsync";

export const PUBLIC_DOCS = [
	{
		description:
			"Install the skill, publish new work, or join an existing workspace.",
		href: "/docs/getting-started",
		label: "Getting started",
	},
	{
		description:
			"Hand Viewer and Collaborator links between people and agents safely.",
		href: "/docs/agent-handoff",
		label: "Agent handoff",
	},
	{
		description:
			"Understand bearer capabilities, access modes, conflicts, and revocation.",
		href: "/docs/security",
		label: "Security",
	},
] as const;

export const PUBLIC_PAGE_METADATA = {
	agentHandoff: {
		description:
			"Use Viewer and Collaborator URLs to coordinate safely through MDSync and HA2HA.",
		title: "Agent handoff — MDSync Docs",
	},
	docs: {
		description:
			"Developer documentation for publishing, sharing, and coordinating through MDSync.",
		title: "MDSync Docs",
	},
	gettingStarted: {
		description:
			"Install the MDSync skill, publish an HA2HA workspace, or join from a shared URL.",
		title: "Getting started — MDSync Docs",
	},
	landing: {
		description:
			"Markdown workspaces where humans and agents coordinate through visible tasks, evidence, and handoffs.",
		title: "MDSync — Human-agent workspaces",
	},
	security: {
		description:
			"Capability security, access boundaries, redaction, conflicts, and revocation in MDSync.",
		title: "Security — MDSync Docs",
	},
} as const;

export type PublicPageMetadata =
	(typeof PUBLIC_PAGE_METADATA)[keyof typeof PUBLIC_PAGE_METADATA];
