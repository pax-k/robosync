import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { CREATED_LINKS_STORAGE_PREFIX } from "./create-workspace-page";

const navClassName = ({ isActive }: { isActive: boolean }) =>
	isActive ? "active" : "";

export interface CreatedLinks {
	editUrl?: string;
	workspaceUrl?: string;
}

export function RailLink({
	icon,
	label,
	onClick,
	to,
}: {
	icon: ReactNode;
	label: string;
	onClick: () => void;
	to: string;
}) {
	return (
		<NavLink
			className={navClassName}
			end={label === "Overview"}
			onClick={onClick}
			to={to}
		>
			{icon}
			<span>{label}</span>
		</NavLink>
	);
}

export function MobileLink({
	icon,
	label,
	to,
}: {
	icon: ReactNode;
	label: string;
	to: string;
}) {
	return (
		<NavLink className={navClassName} end={label === "Overview"} to={to}>
			{icon}
			<span>{label}</span>
		</NavLink>
	);
}

export function capabilitySearch(search: string) {
	const params = new URLSearchParams(search);
	const next = new URLSearchParams();
	const edit = params.get("edit");
	const read = params.get("k");
	if (edit) {
		next.set("edit", edit);
	}
	if (read) {
		next.set("k", read);
	}
	return next;
}

export function withCapability(path: string, search: string) {
	const query = capabilitySearch(search).toString();
	return query ? `${path}?${query}` : path;
}

export function filePathFromLocation(pathname: string, basePath: string) {
	const prefix = `${basePath}/files/`;
	if (!pathname.startsWith(prefix)) {
		return null;
	}
	try {
		return pathname
			.slice(prefix.length)
			.split("/")
			.map(decodeURIComponent)
			.join("/");
	} catch {
		return null;
	}
}

export function routeKind(pathname: string, basePath: string) {
	const suffix = pathname.slice(basePath.length);
	if (suffix.startsWith("/work")) {
		return "work";
	}
	if (suffix.startsWith("/files")) {
		return "files";
	}
	if (suffix.startsWith("/activity")) {
		return "activity";
	}
	if (suffix.startsWith("/settings")) {
		return "settings";
	}
	return "overview";
}

export function pageEyebrow(route: string) {
	switch (route) {
		case "files":
			return "Files";
		case "work":
			return "Work";
		case "activity":
			return "Activity";
		case "settings":
			return "Settings";
		default:
			return "Overview";
	}
}

export function readCreatedLinks(workspaceId: string): CreatedLinks | null {
	try {
		const value = sessionStorage.getItem(
			`${CREATED_LINKS_STORAGE_PREFIX}${workspaceId}`
		);
		return value ? (JSON.parse(value) as CreatedLinks) : null;
	} catch {
		return null;
	}
}
