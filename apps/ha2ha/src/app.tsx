import {
	HA2HA_CAPABILITIES,
	HA2HA_HEADERS,
	HA2HA_HTTP_ROUTES,
	HA2HA_PATHS,
	HA2HA_TASK_STATES,
} from "@ha2ha/protocol/constants";

const navItems = [
	{ href: "#workspace", label: "Workspace" },
	{ href: "#http", label: "HTTP" },
	{ href: "#schemas", label: "Schemas" },
	{ href: "#examples", label: "Examples" },
	{ href: "#conformance", label: "Conformance" },
] as const;

const schemaSurfaces = [
	".ha2ha/workspace.json",
	"tasks/<id>.md frontmatter",
	"participants/<handle>.md frontmatter",
	"evidence frontmatter",
	"target coordinates",
	"workspace events",
	"file versions",
	"conflict responses",
] as const;

const examples = [
	"valid/minimal-workspace",
	"valid/multi-participant-task-workspace",
	"valid/event-history-workspace",
	"invalid/missing-manifest",
	"invalid/invalid-target-coordinate",
	"invalid/missing-actor-file-write",
] as const;

export function App() {
	return (
		<div className="site-shell">
			<header className="topbar">
				<a className="brand" href="#top">
					<span aria-hidden="true" className="brand-mark">
						H2
					</span>
					<span>
						<strong>HA2HA</strong>
						<small>Human-Agent to Human-Agent Protocol</small>
					</span>
				</a>
				<nav aria-label="Protocol sections">
					{navItems.map((item) => (
						<a href={item.href} key={item.href}>
							{item.label}
						</a>
					))}
				</nav>
			</header>

			<main id="top">
				<section aria-labelledby="protocol-title" className="protocol-board">
					<div className="intro-copy">
						<p className="eyebrow">v1 protocol reference</p>
						<h1 id="protocol-title">HA2HA Protocol</h1>
						<p className="lede">
							Shared, versioned, inspectable Markdown workspaces for separate
							human-agent pairs coordinating without hidden state.
						</p>
						<div className="command-strip">
							<code>ha2ha-validate ./workspace</code>
							<code>ha2ha-http-conformance http://localhost:3000</code>
						</div>
					</div>
					<div
						aria-label="HA2HA workspace topology"
						className="workspace-diagram"
						role="img"
					>
						<div className="pair pair-left">
							<span>human-agent pair</span>
							<strong>actor handle</strong>
						</div>
						<div className="workspace-core">
							<span className="core-label">versioned workspace</span>
							<code>{HA2HA_PATHS.manifestMarkdown}</code>
							<code>{HA2HA_PATHS.workspaceManifest}</code>
							<code>{HA2HA_PATHS.tasks}&lt;id&gt;.md</code>
							<code>{HA2HA_PATHS.evidence}&lt;task&gt;/</code>
						</div>
						<div className="pair pair-right">
							<span>human-agent pair</span>
							<strong>baseVersion write</strong>
						</div>
					</div>
				</section>

				<section className="content-grid" id="workspace">
					<div className="section-heading">
						<p className="eyebrow">workspace convention</p>
						<h2>Files are the contract.</h2>
					</div>
					<div className="reference-list">
						{Object.values(HA2HA_PATHS).map((path) => (
							<div className="reference-row" key={path}>
								<code>{path}</code>
								<span>canonical v1 path</span>
							</div>
						))}
					</div>
				</section>

				<section className="split-section" id="http">
					<div>
						<p className="eyebrow">HTTP profile</p>
						<h2>Optimistic writes, deterministic reads.</h2>
						<p>
							Existing file updates and deletes require `baseVersion`. Every
							mutating write carries an actor handle. Conflicts return the
							latest `workspaceId`, `path`, and `version`.
						</p>
					</div>
					<div className="route-table">
						{Object.entries(HA2HA_HTTP_ROUTES).map(([name, route]) => (
							<div className="route-row" key={name}>
								<span>{name}</span>
								<code>{route}</code>
							</div>
						))}
						<div className="route-row accent-row">
							<span>headers</span>
							<code>
								{HA2HA_HEADERS.fileVersion} · {HA2HA_HEADERS.path}
							</code>
						</div>
					</div>
				</section>

				<section className="content-grid" id="schemas">
					<div className="section-heading">
						<p className="eyebrow">schemas</p>
						<h2>Validation surfaces ship with the protocol package.</h2>
					</div>
					<div className="pill-grid">
						{schemaSurfaces.map((surface) => (
							<span key={surface}>{surface}</span>
						))}
					</div>
				</section>

				<section className="split-section" id="examples">
					<div>
						<p className="eyebrow">examples</p>
						<h2>Valid and invalid fixtures are part of the spec.</h2>
						<p>
							Fixtures live under `packages/ha2ha-protocol/examples` and cover
							core workspaces, event/history claims, missing actors, invalid
							targets, and incomplete claim metadata.
						</p>
					</div>
					<div className="example-stack">
						{examples.map((example) => (
							<code key={example}>{example}</code>
						))}
					</div>
				</section>

				<section className="content-grid" id="conformance">
					<div className="section-heading">
						<p className="eyebrow">conformance</p>
						<h2>MDSync is the first measured implementation.</h2>
					</div>
					<div className="conformance-panel">
						<div>
							<strong>Claimed v1 profiles</strong>
							<ul>
								<li>core workspace</li>
								<li>workspace convention</li>
								<li>HTTP profile</li>
								<li>event profile</li>
								<li>file-history profile</li>
							</ul>
						</div>
						<div>
							<strong>Core capabilities</strong>
							<ul>
								{Object.values(HA2HA_CAPABILITIES).map((capability) => (
									<li key={capability}>{capability}</li>
								))}
							</ul>
						</div>
						<div>
							<strong>Task states</strong>
							<ul>
								{HA2HA_TASK_STATES.map((state) => (
									<li key={state}>{state}</li>
								))}
							</ul>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
