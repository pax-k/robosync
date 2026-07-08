import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_LOCAL_SERVER_PORT = "3000";
const DEFAULT_LOCAL_WEB_PORT = "5173";
const BINARY_BYTE = 0;
const TRAILING_SLASH_PATTERN = /\/$/;
const SKIPPED_DIRECTORIES = new Set([
	".alchemy",
	".cache",
	".git",
	".next",
	".turbo",
	".wrangler",
	"coverage",
	"dist",
	"node_modules",
]);
const SKIPPED_FILES = new Set([".DS_Store"]);

const CONTENT_TYPES = new Map([
	[".css", "text/css; charset=utf-8"],
	[".csv", "text/csv; charset=utf-8"],
	[".html", "text/html; charset=utf-8"],
	[".js", "text/javascript; charset=utf-8"],
	[".json", "application/json; charset=utf-8"],
	[".jsonc", "application/json; charset=utf-8"],
	[".jsx", "text/javascript; charset=utf-8"],
	[".md", "text/markdown; charset=utf-8"],
	[".mdx", "text/markdown; charset=utf-8"],
	[".mjs", "text/javascript; charset=utf-8"],
	[".sh", "text/x-shellscript; charset=utf-8"],
	[".sql", "application/sql; charset=utf-8"],
	[".toml", "application/toml; charset=utf-8"],
	[".ts", "text/typescript; charset=utf-8"],
	[".tsx", "text/typescript; charset=utf-8"],
	[".txt", "text/plain; charset=utf-8"],
	[".xml", "application/xml; charset=utf-8"],
	[".yaml", "application/yaml; charset=utf-8"],
	[".yml", "application/yaml; charset=utf-8"],
]);

export function baseUrl() {
	return (process.env.MDSYNC_BASE_URL ?? DEFAULT_BASE_URL).replace(
		TRAILING_SLASH_PATTERN,
		""
	);
}

export function buildRawFileUrl(workspaceId, filePath, token) {
	return `${baseUrl()}/w/${encodeURIComponent(workspaceId)}/raw/${encodePath(filePath)}${editQuery(token)}`;
}

export function buildRawListingUrl(workspaceId, token) {
	return `${baseUrl()}/w/${encodeURIComponent(workspaceId)}/raw${editQuery(token)}`;
}

export function buildWorkspaceUrl(workspaceId, token) {
	return `${webBaseUrl()}/w/${encodeURIComponent(workspaceId)}${editQuery(token)}`;
}

export async function collectWorkspaceFiles(directory) {
	const root = path.resolve(directory);
	const files = [];

	await walkDirectory(root, root, files);
	files.sort((left, right) => left.path.localeCompare(right.path));

	return files;
}

export function contentTypeForPath(filePath) {
	return (
		CONTENT_TYPES.get(path.extname(filePath).toLowerCase()) ??
		"text/plain; charset=utf-8"
	);
}

export function die(message) {
	console.error(message);
	process.exit(1);
}

export function parseArgs(args, usage) {
	const options = {};
	const positional = [];

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (!arg?.startsWith("--")) {
			positional.push(arg);
			continue;
		}

		if (arg === "--help" || arg === "-h") {
			console.log(usage);
			process.exit(0);
		}

		if (["--public", "--private", "--editable", "--readonly"].includes(arg)) {
			options[arg.slice(2)] = true;
			continue;
		}

		if (
			["--actor", "--base-version", "--path", "--title", "--token"].includes(
				arg
			)
		) {
			const value = args[index + 1];
			if (!value || value.startsWith("--")) {
				die(`Missing value for ${arg}.\n\n${usage}`);
			}
			options[arg.slice(2)] = value;
			index += 1;
			continue;
		}

		die(`Unknown option: ${arg}\n\n${usage}`);
	}

	return { options, positional };
}

export function readAccessFromOptions(options) {
	if (options.public && options.private) {
		die("--public and --private cannot be used together.");
	}
	return options.public ? "public" : "token";
}

export async function readTextFile(filePath) {
	const buffer = await readFile(filePath);
	if (buffer.includes(BINARY_BYTE)) {
		die(`Refusing to upload binary file: ${filePath}`);
	}
	return buffer.toString("utf8");
}

export async function requestJson(url, init) {
	const response = await fetch(url, init);
	const text = await response.text();
	const payload = parseJson(text, url);

	if (!response.ok) {
		const message = payload.message ?? payload.error ?? response.statusText;
		die(
			`${init.method ?? "GET"} ${url} failed with ${response.status}: ${message}`
		);
	}

	return payload;
}

export function printWorkspaceLinks(payload) {
	console.log(`Workspace ID: ${payload.id}`);
	console.log(`Human preview: ${payload.workspaceUrl}`);
	console.log(`Agent raw listing: ${payload.rawUrl}`);
	if (payload.editUrl) {
		console.log(`Edit link: ${payload.editUrl}`);
	}
}

export function writeAccessFromOptions(options) {
	if (options.editable && options.readonly) {
		die("--editable and --readonly cannot be used together.");
	}
	return options.readonly ? "none" : "token";
}

function editQuery(token) {
	return token ? `?edit=${encodeURIComponent(token)}` : "";
}

function encodePath(filePath) {
	return filePath.split("/").map(encodeURIComponent).join("/");
}

function webBaseUrl() {
	if (process.env.MDSYNC_WEB_URL) {
		return process.env.MDSYNC_WEB_URL.replace(TRAILING_SLASH_PATTERN, "");
	}

	const url = new URL(baseUrl());
	if (url.hostname === "localhost" && url.port === DEFAULT_LOCAL_SERVER_PORT) {
		url.port = DEFAULT_LOCAL_WEB_PORT;
		return url.origin;
	}
	url.hostname = url.hostname.replace("mdsync-server-", "mdsync-web-");
	return url.origin;
}

async function walkDirectory(root, directory, files) {
	const entries = await readdir(directory, { withFileTypes: true });
	entries.sort((left, right) => left.name.localeCompare(right.name));

	await Promise.all(
		entries.map((entry) => collectEntry(root, directory, files, entry))
	);
}

async function collectEntry(root, directory, files, entry) {
	if (entry.isDirectory()) {
		if (!SKIPPED_DIRECTORIES.has(entry.name)) {
			await walkDirectory(root, path.join(directory, entry.name), files);
		}
		return;
	}

	if (!(entry.isFile() && !SKIPPED_FILES.has(entry.name))) {
		return;
	}

	const absolutePath = path.join(directory, entry.name);
	const buffer = await readFile(absolutePath);
	if (buffer.includes(BINARY_BYTE)) {
		return;
	}

	const relativePath = path
		.relative(root, absolutePath)
		.split(path.sep)
		.join("/");
	files.push({
		content: buffer.toString("utf8"),
		contentType: contentTypeForPath(relativePath),
		path: relativePath,
	});
}

function parseJson(text, url) {
	try {
		return JSON.parse(text);
	} catch {
		die(`Expected JSON response from ${url}.`);
	}
}
