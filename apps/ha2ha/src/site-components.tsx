import { useCallback, useState } from "react";

import {
	ADOPTION_STEPS,
	CAPABILITY_GROUPS,
	COMMANDS,
	CONFORMANCE_CHECKS,
	EXAMPLE_FIXTURES,
	FAILURE_CLASSES,
	FAQ_ITEMS,
	NAV_ITEMS,
	PRINCIPLES,
	PROTOCOL_MATURITY,
	SITE_LINKS,
	WORKSPACE_TREE,
} from "./site-content";

export function SiteHeader() {
	return (
		<header className="site-header">
			<div className="header-inner container">
				<a aria-label="HA2HA home" className="wordmark" href="#top">
					<span aria-hidden="true" className="wordmark-symbol">
						H↔H
					</span>
					<span>HA2HA</span>
				</a>
				<nav aria-label="Main navigation" className="main-nav">
					{NAV_ITEMS.map((item) => (
						<a href={item.href} key={item.href}>
							{item.label}
						</a>
					))}
				</nav>
				<div className="header-links">
					<a className="header-external" href={SITE_LINKS.github}>
						GitHub
					</a>
					<a className="header-skill" href={SITE_LINKS.ha2haSkill}>
						Install skill
					</a>
				</div>
			</div>
		</header>
	);
}

function WorkspaceSpecimen() {
	return (
		<figure className="workspace-specimen">
			<figcaption>
				<span>Shared workspace</span>
				<span className="specimen-status">Inspectable by every pair</span>
			</figcaption>
			<div className="specimen-file">
				<div className="file-tab">
					<span aria-hidden="true" className="file-dot" />
					HA2HA.md
				</div>
				<pre>
					<code>
						<span className="code-heading"># Product launch workspace</span>
						{"\n\n"}
						<span className="code-key">participants:</span>
						{"\n"} - pax + codex
						{"\n"} - ana + claude
						{"\n\n"}
						<span className="code-key">task:</span> review-api
						{"\n"}
						<span className="code-key">state:</span> claimed
						{"\n"}
						<span className="code-key">actor:</span> codex-pax
						{"\n"}
						<span className="code-key">baseVersion:</span> 12
						{"\n"}
						<span className="code-key">evidence:</span>{" "}
						evidence/review-api/checks.md
						{"\n"}
						<span className="code-key">handoff:</span> ready
					</code>
				</pre>
			</div>
			<aside aria-label="Workspace activity" className="specimen-ledger">
				<span>
					<strong>12</strong> read
				</span>
				<span aria-hidden="true">→</span>
				<span>
					<strong>13</strong> written by codex-pax
				</span>
				<span className="ledger-proof">evidence attached</span>
			</aside>
		</figure>
	);
}

export function Hero() {
	return (
		<section className="hero" id="top">
			<div className="hero-grid container">
				<div className="hero-copy">
					<p className="kicker">Open collaboration protocol</p>
					<h1>HA2HA</h1>
					<p className="hero-definition">
						A simple, open protocol for human-agent teams working together.
					</p>
					<p className="hero-support">
						Shared, versioned Markdown workspaces let separate human-agent pairs
						coordinate through visible state, safe writes, and portable
						evidence.
					</p>
					<div className="hero-actions">
						<a className="button button-primary" href="#protocol">
							Read the protocol
						</a>
						<a className="button button-secondary" href={SITE_LINKS.ha2haSkill}>
							Install the skill
						</a>
						<a className="hero-text-link text-link" href={SITE_LINKS.github}>
							View on GitHub
						</a>
					</div>
				</div>
				<WorkspaceSpecimen />
			</div>
		</section>
	);
}

export function WhySection() {
	return (
		<section className="section" id="why">
			<div className="container">
				<div className="section-intro section-intro-wide">
					<div>
						<p className="kicker">Why HA2HA</p>
						<h2>Files are the contract.</h2>
					</div>
					<p>
						Human-agent collaboration should not disappear into a chat history,
						private runtime, or vendor database. HA2HA keeps the working truth
						in artifacts every participant can inspect.
					</p>
				</div>
				<div className="principle-grid">
					{PRINCIPLES.map((principle) => (
						<article className="principle" key={principle.title}>
							<h3>{principle.title}</h3>
							<p>{principle.description}</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

export function ProtocolSection() {
	return (
		<section className="section section-tinted" id="protocol">
			<div className="container">
				<div className="section-intro">
					<div>
						<p className="kicker">The protocol</p>
						<h2>One workspace. Independent capabilities.</h2>
					</div>
					<p>
						Adopt only what the work needs. Every capability builds on the same
						portable files, versioned targets, and explicit actors.
					</p>
				</div>
				<div className="maturity-grid">
					{PROTOCOL_MATURITY.map((item) => (
						<article key={item.title}>
							<span>{item.label}</span>
							<h3>{item.title}</h3>
							<p>{item.description}</p>
						</article>
					))}
				</div>
				<div className="capability-grid">
					{CAPABILITY_GROUPS.map((group) => (
						<article className="capability" key={group.label}>
							<h3>{group.label}</h3>
							<p>{group.description}</p>
							<ul aria-label={`${group.label} protocol terms`}>
								{group.terms.map((term) => (
									<li key={term}>
										<code>{term}</code>
									</li>
								))}
							</ul>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

export function WorkspaceSection() {
	return (
		<section className="section" id="workspace">
			<div className="workspace-layout container">
				<div className="workspace-copy">
					<p className="kicker">Workspace anatomy</p>
					<h2>Readable first. Machine-checkable throughout.</h2>
					<p>
						Markdown keeps status, tasks, decisions, handoffs, and proof easy to
						inspect. Structured frontmatter and manifests make the same records
						validatable by tools.
					</p>
					<p>
						The workspace is the shared object. Products can add interfaces
						around it without trapping the work inside their own state.
					</p>
				</div>
				<section
					aria-label="Canonical workspace files"
					className="workspace-tree"
				>
					<div className="tree-title">
						<span>workspace/</span>
						<span>portable</span>
					</div>
					<ul>
						{WORKSPACE_TREE.map((path) => (
							<li key={path}>
								<span aria-hidden="true" className="tree-branch">
									├─
								</span>
								<code>{path}</code>
							</li>
						))}
					</ul>
				</section>
			</div>
		</section>
	);
}

interface CommandCardProps {
	command: string;
	label: string;
	name: string;
}

function CommandCard({ command, label, name }: CommandCardProps) {
	const [announcement, setAnnouncement] = useState("");

	const copyCommand = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(command);
			setAnnouncement(`Copied ${name} command.`);
		} catch {
			setAnnouncement("Copy unavailable. Select and copy the command.");
		}
	}, [command, name]);

	return (
		<div className="command-card">
			<span className="command-label">{label}</span>
			<div className="command-line">
				<code>{command}</code>
				<button
					aria-label={`Copy ${name} command`}
					onClick={copyCommand}
					type="button"
				>
					Copy
				</button>
			</div>
			<p aria-live="polite" className="copy-status">
				{announcement}
			</p>
		</div>
	);
}

export function AdoptionSection() {
	return (
		<section className="section section-dark" id="adopt">
			<div className="container">
				<div className="section-intro">
					<div>
						<p className="kicker">Adopt HA2HA</p>
						<h2>Start with files. Add transport when needed.</h2>
					</div>
					<p>
						A folder can implement the convention. A service can additionally
						claim methods, transport behavior, and live conformance.
					</p>
				</div>
				<ol className="adoption-steps">
					{ADOPTION_STEPS.map((step, index) => (
						<li key={step.title}>
							<span>{String(index + 1).padStart(2, "0")}</span>
							<h3>{step.title}</h3>
							<p>{step.description}</p>
						</li>
					))}
				</ol>
				<div className="command-grid">
					{COMMANDS.map((command) => (
						<CommandCard key={command.name} {...command} />
					))}
				</div>
				<p className="adoption-tools">
					Need validators, clients, or conformance fixtures? The source packages
					are available on <a href={SITE_LINKS.github}>GitHub</a>. Registry
					publication remains pending.
				</p>
			</div>
		</section>
	);
}

interface TermListProps {
	items: readonly string[];
	label: string;
}

function TermList({ items, label }: TermListProps) {
	return (
		<div className="term-group">
			<h3>{label}</h3>
			<ul>
				{items.map((item) => (
					<li key={item}>
						<code>{item}</code>
					</li>
				))}
			</ul>
		</div>
	);
}

export function ConformanceSection() {
	return (
		<section className="section" id="conformance">
			<div className="container">
				<div className="section-intro section-intro-wide">
					<div>
						<p className="kicker">Conformance</p>
						<h2>Claims should be measurable.</h2>
					</div>
					<p>
						Implementations declare the capabilities they support. Shared
						methods, failure classes, valid fixtures, and deliberately invalid
						fixtures turn those claims into repeatable checks.
					</p>
				</div>
				<div className="conformance-grid">
					<TermList items={CONFORMANCE_CHECKS} label="Measured checks" />
					<TermList items={FAILURE_CLASSES} label="Shared failures" />
					<TermList items={EXAMPLE_FIXTURES} label="Portable fixtures" />
				</div>
			</div>
		</section>
	);
}

export function MdsyncSection() {
	return (
		<section className="section section-tinted" id="mdsync">
			<div className="mdsync-panel container">
				<div>
					<p className="kicker">MDSync</p>
					<h2>The first HA2HA implementation.</h2>
				</div>
				<div className="mdsync-copy">
					<p>
						MDSync provides the hosted workspace experience: publishing, browser
						editing, comments, history, administration, and team workflows.
					</p>
					<p>
						HA2HA remains the portable protocol underneath it, available to
						local tools and independent implementations without MDSync product
						state.
					</p>
					<div className="mdsync-links">
						<a className="text-link" href={SITE_LINKS.mdsync}>
							Explore MDSync
						</a>
						<a className="text-link" href={SITE_LINKS.mdsyncSkill}>
							Install the MDSync skill
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}

export function FaqSection() {
	return (
		<section className="section" id="faq">
			<div className="faq-layout container">
				<div>
					<p className="kicker">FAQ</p>
					<h2>Questions about the protocol.</h2>
				</div>
				<div className="faq-list">
					{FAQ_ITEMS.map((item) => (
						<details key={item.question}>
							<summary>{item.question}</summary>
							<p>{item.answer}</p>
						</details>
					))}
				</div>
			</div>
		</section>
	);
}

export function SiteFooter() {
	return (
		<footer className="site-footer">
			<div className="footer-inner container">
				<div>
					<strong>HA2HA</strong>
					<p>An open protocol for inspectable human-agent collaboration.</p>
				</div>
				<nav aria-label="Footer navigation">
					<a href="#protocol">Protocol</a>
					<a href="#adopt">Adopt</a>
					<a href={SITE_LINKS.ha2haSkill}>HA2HA skill</a>
					<a href={SITE_LINKS.mdsync}>MDSync</a>
					<a href={SITE_LINKS.github}>GitHub</a>
				</nav>
			</div>
		</footer>
	);
}
