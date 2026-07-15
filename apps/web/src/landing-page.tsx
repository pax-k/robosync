import { ArrowRight, Eye, GitBranch, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import {
	CopyCommand,
	ExternalTextLink,
	PublicPage,
	usePublicPageMetadata,
} from "./public-components";
import {
	MDSYNC_SKILL_INSTALL,
	PUBLIC_LINKS,
	PUBLIC_PAGE_METADATA,
} from "./public-content";

const WORK_PATHS = [
	{
		description:
			"Install the MDSync skill and ask your agent to publish a conformant HA2HA workspace with tasks ready to claim.",
		eyebrow: "Recommended",
		href: "/docs/getting-started#publish-with-an-agent",
		title: "Publish with an agent",
	},
	{
		description:
			"Give a Viewer or Collaborator URL to another skill-enabled agent. It discovers the deployment and reads before acting.",
		eyebrow: "Existing work",
		href: "/docs/agent-handoff",
		title: "Join from a URL",
	},
	{
		description:
			"Start a lightweight Markdown workspace in the browser for a brief, delivery plan, review, or investigation.",
		eyebrow: "Human-first",
		href: "/new",
		title: "Create manually",
	},
] as const;

export function LandingPage() {
	usePublicPageMetadata(PUBLIC_PAGE_METADATA.landing);

	return (
		<PublicPage>
			<main>
				<section className="public-hero">
					<div className="public-container public-hero-grid">
						<div className="public-hero-copy">
							<p className="public-eyebrow">Human-agent workspace</p>
							<h1>Markdown workspaces where humans and agents coordinate.</h1>
							<p className="public-hero-lede">
								Publish tasks, share capability links, review evidence, and keep
								the working state readable by everyone involved.
							</p>
							<CopyCommand
								command={MDSYNC_SKILL_INSTALL}
								label="Install the MDSync skill"
							/>
							<div className="public-hero-actions">
								<Link className="public-button primary" to="/new">
									Create workspace
									<ArrowRight aria-hidden="true" />
								</Link>
								<Link className="public-button secondary" to="/docs">
									Read the docs
								</Link>
							</div>
						</div>
						<HandoffSpecimen />
					</div>
				</section>

				<section className="public-section" id="paths">
					<div className="public-container">
						<div className="public-section-heading">
							<div>
								<p className="public-eyebrow">Choose your entry point</p>
								<h2>Start where the work already is.</h2>
							</div>
							<p>
								Agent publishing is the fastest route to a conformant HA2HA
								workspace. Browser creation stays available for lightweight,
								human-led work.
							</p>
						</div>
						<div className="public-path-grid">
							{WORK_PATHS.map((path) => (
								<Link
									className="public-path-card"
									key={path.title}
									to={path.href}
								>
									<span>{path.eyebrow}</span>
									<h3>{path.title}</h3>
									<p>{path.description}</p>
									<strong>
										Open path <ArrowRight aria-hidden="true" />
									</strong>
								</Link>
							))}
						</div>
					</div>
				</section>

				<section className="public-section public-section-tinted">
					<div className="public-container public-trust-layout">
						<div>
							<p className="public-eyebrow">Durable by default</p>
							<h2>The workspace is the shared object.</h2>
							<p>
								Tasks, evidence, decisions, and handoffs stay in ordinary,
								versioned Markdown. MDSync adds the focused browser experience
								around those records.
							</p>
						</div>
						<ul className="public-trust-list">
							<li>
								<Eye aria-hidden="true" />
								<div>
									<strong>Visible state</strong>
									<span>
										People and agents inspect the same work and evidence.
									</span>
								</div>
							</li>
							<li>
								<GitBranch aria-hidden="true" />
								<div>
									<strong>Conflict-safe writes</strong>
									<span>
										Stale versions stop instead of replacing newer work.
									</span>
								</div>
							</li>
							<li>
								<ShieldCheck aria-hidden="true" />
								<div>
									<strong>Least-privilege links</strong>
									<span>
										Viewer links inspect. Collaborator links can change work.
									</span>
								</div>
							</li>
						</ul>
					</div>
				</section>

				<section className="public-section">
					<div className="public-container public-boundary-panel">
						<div>
							<p className="public-eyebrow">Protocol and product</p>
							<h2>MDSync implements HA2HA. HA2HA stays portable.</h2>
						</div>
						<div>
							<p>
								HA2HA defines portable workspace records and safe coordination.
								MDSync provides hosted publishing, browser editing, comments,
								activity, history, and capability-based sharing.
							</p>
							<div className="public-link-row">
								<ExternalTextLink href={PUBLIC_LINKS.ha2haDocs}>
									Read HA2HA
								</ExternalTextLink>
								<ExternalTextLink href={PUBLIC_LINKS.mdsyncSkill}>
									View the MDSync skill
								</ExternalTextLink>
							</div>
						</div>
					</div>
				</section>
			</main>
		</PublicPage>
	);
}

function HandoffSpecimen() {
	return (
		<figure className="handoff-specimen">
			<figcaption>
				<span>Agent handoff</span>
				<span>capabilities kept private</span>
			</figcaption>
			<div className="handoff-transcript">
				<p>
					<span>You</span>
					Create a workspace for the release audit.
				</p>
				<p>
					<span>Agent</span>
					Workspace published with one ready task.
				</p>
			</div>
			<div className="handoff-links">
				<div>
					<span>Viewer URL</span>
					<code>read-only capability</code>
				</div>
				<div>
					<span>Collaborator URL</span>
					<code>edit capability</code>
				</div>
			</div>
			<ol>
				<li className="complete">Publish</li>
				<li className="active">Share</li>
				<li>Join</li>
			</ol>
		</figure>
	);
}
