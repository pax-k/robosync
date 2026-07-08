#!/usr/bin/env node
import path from "node:path";

import {
	baseUrl,
	contentTypeForPath,
	parseArgs,
	printWorkspaceLinks,
	readAccessFromOptions,
	readTextFile,
	requestJson,
	writeAccessFromOptions,
} from "./lib/mdsync.mjs";

const USAGE = `Usage:
  node scripts/upload-file.mjs <file> [--path <path>] [--title <title>] [--public|--private] [--editable|--readonly]`;

const { options, positional } = parseArgs(process.argv.slice(2), USAGE);
const [file] = positional;

if (!(file && positional.length === 1)) {
	console.error(USAGE);
	process.exit(1);
}

const workspaceFilePath = options.path ?? "README.md";
const content = await readTextFile(file);
const response = await requestJson(`${baseUrl()}/api/workspaces`, {
	body: JSON.stringify({
		files: [
			{
				content,
				contentType: contentTypeForPath(workspaceFilePath),
				path: workspaceFilePath,
			},
		],
		readAccess: readAccessFromOptions(options),
		title: options.title ?? path.basename(file),
		writeAccess: writeAccessFromOptions(options),
	}),
	headers: {
		"Content-Type": "application/json",
	},
	method: "POST",
});

printWorkspaceLinks(response);
