import { Link } from "react-router";
import {
	CopyCommand,
	DocsShell,
	ExternalTextLink,
	usePublicPageMetadata,
} from "./public-components";
import {
	MDSYNC_SKILL_INSTALL,
	PUBLIC_DOCS,
	PUBLIC_LINKS,
	PUBLIC_PAGE_METADATA,
} from "./public-content";

export function DocsIndexPage() {
	usePublicPageMetadata(PUBLIC_PAGE_METADATA.docs);
	return (
		<DocsShell
			description="Publish, share, and coordinate work without hiding state inside an agent runtime or chat history."
			eyebrow="Developer documentation"
			title="Build a shared place for the work."
		>
			<section className="docs-section">
				<h2>Start with the workflow</h2>
				<div className="docs-card-grid">
					{PUBLIC_DOCS.map((item) => (
						<Link className="docs-card" key={item.href} to={item.href}>
							<strong>{item.label}</strong>
							<span>{item.description}</span>
						</Link>
					))}
				</div>
			</section>
			<section className="docs-section">
				<h2>Product boundary</h2>
				<p>
					HA2HA defines portable workspace files, task state, evidence,
					decisions, handoffs, actors, and version conflicts. MDSync adds hosted
					publishing, capability links, browser editing, comments, activity,
					history, settings, and retention.
				</p>
				<p>
					Installing a skill grants no workspace access. A shared Viewer or
					Collaborator URL authorizes each individual workspace.
				</p>
				<ExternalTextLink href={PUBLIC_LINKS.ha2haDocs}>
					Read the portable HA2HA protocol
				</ExternalTextLink>
			</section>
			<section className="docs-note">
				<strong>Package status</strong>
				<p>
					GitHub and skills.sh installation are available now. Registry packages
					remain pending, so the public quickstart uses the complete skill HTTP
					workflow rather than requiring an npm SDK installation.
				</p>
			</section>
		</DocsShell>
	);
}

export function GettingStartedPage() {
	usePublicPageMetadata(PUBLIC_PAGE_METADATA.gettingStarted);
	return (
		<DocsShell
			description="Install one skill, then publish new work or join a workspace from the URL someone shared with you."
			eyebrow="Quickstart"
			title="Getting started"
		>
			<section className="docs-section" id="install">
				<h2>1. Install the MDSync skill</h2>
				<CopyCommand command={MDSYNC_SKILL_INSTALL} label="Install command" />
				<p>
					The skill teaches an agent how to use hosted MDSync while preserving
					HA2HA task, evidence, and conflict semantics. Installation does not
					grant access to any workspace.
				</p>
			</section>
			<section className="docs-section" id="publish-with-an-agent">
				<h2>2. Publish with an agent</h2>
				<p>Ask the agent to create the work with a stable actor handle:</p>
				<blockquote>
					Use $mdsync to publish an HA2HA workspace for the release audit.
					Create one ready task for verifying the deployment and return the
					Viewer and Collaborator URLs.
				</blockquote>
				<p>
					Agent publishing creates the canonical manifest, guide, status,
					participant, and valid task records atomically. The two returned URLs
					are bearer capabilities; keep them out of files, comments, evidence,
					logs, and public issue trackers.
				</p>
			</section>
			<section className="docs-section" id="join">
				<h2>3. Join existing work</h2>
				<p>
					Paste the shared URL to a skill-enabled agent. The agent discovers the
					correct Web and API origins from that URL, validates the workspace,
					and reads relevant tasks before acting.
				</p>
				<blockquote>
					Use $mdsync to join this workspace as reviewer-river, inspect the
					ready tasks, and tell me the next safe action: [paste shared URL]
				</blockquote>
				<p>
					A Viewer URL supports inspection only. Claiming work, writing
					evidence, commenting, resolving, or changing files requires a
					Collaborator URL.
				</p>
			</section>
			<section className="docs-section" id="manual">
				<h2>Manual browser creation</h2>
				<p>
					The browser creator produces lightweight MDSync Markdown presets. Use
					it for briefs, delivery work, reviews, and investigations that do not
					need agent-published HA2HA conformance at creation time.
				</p>
				<Link className="public-button primary" to="/new">
					Create a workspace
				</Link>
			</section>
		</DocsShell>
	);
}

export function AgentHandoffPage() {
	usePublicPageMetadata(PUBLIC_PAGE_METADATA.agentHandoff);
	return (
		<DocsShell
			description="Use a capability URL as the complete handoff boundary between independent human-agent pairs."
			eyebrow="Coordination"
			title="Agent handoff"
		>
			<section className="docs-section">
				<h2>Publish once, hand off directly</h2>
				<ol className="docs-steps">
					<li>
						<strong>Publisher</strong>
						<span>
							Creates a conformant workspace with an explicit actor and task.
						</span>
					</li>
					<li>
						<strong>Human</strong>
						<span>
							Shares the appropriate Viewer or Collaborator URL directly.
						</span>
					</li>
					<li>
						<strong>Collaborator</strong>
						<span>
							Discovers, validates, reads, claims, and records evidence.
						</span>
					</li>
				</ol>
			</section>
			<section className="docs-section">
				<h2>Read before mutation</h2>
				<p>
					A joining agent reads Overview, <code>HA2HA.md</code>, the workspace
					manifest, its participant state, and relevant tasks. It validates
					HA2HA Core 1.0 and the exact <code>baseVersion-required</code>{" "}
					conflict policy before writing.
				</p>
			</section>
			<section className="docs-section">
				<h2>Coordinate through records</h2>
				<p>
					Claim the task before doing the work. Store redacted evidence under
					the task evidence path, link it from the task, and update status for
					the next pair. Product comments and activity can support review, but
					they do not replace portable HA2HA records.
				</p>
			</section>
			<section className="docs-section">
				<h2>Stop safely on conflict</h2>
				<p>
					Every existing-file write includes the version the agent read. A stale
					write returns <code>version_conflict</code> and preserves both local
					and remote content. Re-read and reconcile once; stop after a second
					conflict instead of overwriting.
				</p>
			</section>
			<ExternalTextLink href={PUBLIC_LINKS.mdsyncSkill}>
				Open the complete MDSync skill
			</ExternalTextLink>
		</DocsShell>
	);
}

export function SecurityPage() {
	usePublicPageMetadata(PUBLIC_PAGE_METADATA.security);
	return (
		<DocsShell
			description="Treat workspace URLs as scoped bearer credentials and keep secrets outside durable collaboration records."
			eyebrow="Trust boundary"
			title="Security"
		>
			<section className="docs-section">
				<h2>Capability links</h2>
				<div className="docs-comparison">
					<div>
						<strong>Viewer URL</strong>
						<p>Reads workspace state. Mutations fail closed.</p>
					</div>
					<div>
						<strong>Collaborator URL</strong>
						<p>Can claim, write, comment, resolve, and change settings.</p>
					</div>
				</div>
				<p>
					Installing either public skill grants no authority. Access comes only
					from the individual URL shared for that workspace.
				</p>
			</section>
			<section className="docs-section">
				<h2>Keep capabilities out of durable state</h2>
				<p>
					Never place Viewer or Collaborator URLs in workspace files, evidence,
					comments, activity details, commands, diagnostics, screenshots, public
					issues, or logs. Store only redacted route names and target
					coordinates.
				</p>
			</section>
			<section className="docs-section">
				<h2>Rotate and revoke deliberately</h2>
				<p>
					Creating a new capability invalidates the old link. Revoking the
					current Collaborator capability changes that session to read-only
					immediately. Confirm both actions and redistribute the new URL only to
					intended participants.
				</p>
			</section>
			<section className="docs-note attention">
				<strong>Asserted identity</strong>
				<p>
					Actor handles describe who claims an action; they are not
					authenticated identities in this release. Use stable, recognizable
					handles and treat capability possession as the authorization boundary.
				</p>
			</section>
		</DocsShell>
	);
}
