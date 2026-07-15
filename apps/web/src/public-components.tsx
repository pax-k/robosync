import { ArrowUpRight, Check, Copy } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useId, useState } from "react";
import { Link, NavLink, type NavLinkRenderProps } from "react-router";
import {
	PUBLIC_DOCS,
	PUBLIC_LINKS,
	type PublicPageMetadata,
} from "./public-content";

interface CopyCommandProps {
	command: string;
	label: string;
}

type CopyStatus = "copied" | "failed" | "idle";

export function CopyCommand({ command, label }: CopyCommandProps) {
	const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
	const statusId = useId();
	const copyCommand = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(command);
			setCopyStatus("copied");
		} catch {
			setCopyStatus("failed");
		}
	}, [command]);
	const copied = copyStatus === "copied";
	const announcement = copied
		? `${label} copied.`
		: "Copy unavailable. Select and copy the command.";

	return (
		<div className="public-command">
			<span className="public-command-label">{label}</span>
			<div className="public-command-line">
				<code>{command}</code>
				<button
					aria-describedby={statusId}
					aria-label={`Copy ${label.toLowerCase()}`}
					onClick={copyCommand}
					type="button"
				>
					{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
					<span>{copied ? "Copied" : "Copy"}</span>
				</button>
			</div>
			<span
				aria-live="polite"
				className={copyStatus === "failed" ? "public-command-error" : "sr-only"}
				id={statusId}
			>
				{copyStatus === "idle" ? "" : announcement}
			</span>
		</div>
	);
}

export function PublicHeader() {
	return (
		<header className="public-header">
			<div className="public-container public-header-inner">
				<Link aria-label="MDSync home" className="wordmark" to="/">
					<span aria-hidden="true" className="wordmark-mark">
						M
					</span>
					<span>MDSync</span>
				</Link>
				<nav aria-label="Public navigation" className="public-nav">
					<Link to="/">Product</Link>
					<Link to="/docs">Docs</Link>
					<a href={PUBLIC_LINKS.ha2haDocs}>HA2HA</a>
					<a href={PUBLIC_LINKS.github}>GitHub</a>
				</nav>
				<Link className="public-header-action" to="/new">
					Create workspace
				</Link>
			</div>
		</header>
	);
}

export function PublicFooter() {
	return (
		<footer className="public-footer">
			<div className="public-container public-footer-inner">
				<div>
					<strong>MDSync</strong>
					<p>Hosted Markdown workspaces built on the open HA2HA protocol.</p>
				</div>
				<nav aria-label="Footer navigation">
					<Link to="/docs">Docs</Link>
					<a href={PUBLIC_LINKS.mdsyncSkill}>MDSync skill</a>
					<a href={PUBLIC_LINKS.ha2haDocs}>HA2HA</a>
					<a href={PUBLIC_LINKS.github}>GitHub</a>
				</nav>
			</div>
		</footer>
	);
}

interface PublicPageProps {
	children: ReactNode;
}

export function PublicPage({ children }: PublicPageProps) {
	return (
		<div className="public-site">
			<PublicHeader />
			{children}
			<PublicFooter />
		</div>
	);
}

interface DocsShellProps {
	children: ReactNode;
	description: string;
	eyebrow: string;
	title: string;
}

export function DocsShell({
	children,
	description,
	eyebrow,
	title,
}: DocsShellProps) {
	return (
		<PublicPage>
			<main className="docs-main">
				<div className="public-container docs-layout">
					<aside className="docs-rail">
						<Link className="docs-home-link" to="/docs">
							MDSync docs
						</Link>
						<nav aria-label="Documentation navigation">
							{PUBLIC_DOCS.map((item) => (
								<NavLink
									className={documentationLinkClassName}
									key={item.href}
									to={item.href}
								>
									{item.label}
								</NavLink>
							))}
						</nav>
					</aside>
					<article className="docs-article">
						<header className="docs-title">
							<p className="public-eyebrow">{eyebrow}</p>
							<h1>{title}</h1>
							<p>{description}</p>
						</header>
						{children}
					</article>
				</div>
			</main>
		</PublicPage>
	);
}

function documentationLinkClassName({ isActive }: NavLinkRenderProps) {
	return isActive ? "active" : "";
}

interface ExternalTextLinkProps {
	children: ReactNode;
	href: string;
}

export function ExternalTextLink({ children, href }: ExternalTextLinkProps) {
	return (
		<a className="public-text-link" href={href}>
			{children}
			<ArrowUpRight aria-hidden="true" />
		</a>
	);
}

export function usePublicPageMetadata(metadata: PublicPageMetadata) {
	useEffect(() => {
		document.title = metadata.title;
		let description = document.querySelector<HTMLMetaElement>(
			'meta[name="description"]'
		);
		if (!description) {
			description = document.createElement("meta");
			description.name = "description";
			document.head.appendChild(description);
		}
		description.content = metadata.description;
	}, [metadata]);
}
