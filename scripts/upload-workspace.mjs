#!/usr/bin/env node
import path from "node:path";

import {
	baseUrl,
	collectWorkspaceFiles,
	die,
	parseArgs,
	printWorkspaceLinks,
	readAccessFromOptions,
	requestJson,
	writeAccessFromOptions,
} from "./lib/mdsync.mjs";

const USAGE = `Usage:
  node scripts/upload-workspace.mjs <directory> [--title <title>] [--public|--private] [--editable|--readonly]`;

const { options, positional } = parseArgs(process.argv.slice(2), USAGE);
const [directory] = positional;

if (!(directory && positional.length === 1)) {
	console.error(USAGE);
	process.exit(1);
}

const files = await collectWorkspaceFiles(directory);
if (files.length === 0) {
	die(`No text files found under ${directory}.`);
}

const response = await requestJson(`${baseUrl()}/api/workspaces`, {
	body: JSON.stringify({
		files,
		readAccess: readAccessFromOptions(options),
		title: options.title ?? path.basename(path.resolve(directory)),
		writeAccess: writeAccessFromOptions(options),
	}),
	headers: {
		"Content-Type": "application/json",
	},
	method: "POST",
});

printWorkspaceLinks(response);
