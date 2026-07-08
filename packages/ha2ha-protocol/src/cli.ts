#!/usr/bin/env node
import path from "node:path";

import {
	type Ha2haValidationResult,
	validateHa2haWorkspace,
} from "./validator";

const printUsage = () => {
	process.stderr.write(
		"Usage: ha2ha-validate <workspace-dir> [...workspace-dir]\n"
	);
};

const main = async () => {
	const workspaceDirs = process.argv.slice(2);
	if (workspaceDirs.length === 0) {
		printUsage();
		process.exitCode = 2;
		return;
	}

	const results: Ha2haValidationResult[] = await Promise.all(
		workspaceDirs.map((workspaceDir) =>
			validateHa2haWorkspace(path.resolve(workspaceDir))
		)
	);
	const ok = results.every((result) => result.ok);
	process.stdout.write(
		`${JSON.stringify({ ok, results }, null, 2)}
`
	);
	process.exitCode = ok ? 0 : 1;
};

await main();
