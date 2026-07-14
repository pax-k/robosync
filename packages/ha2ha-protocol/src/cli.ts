#!/usr/bin/env node
import path from "node:path";
import {
	type Ha2haV3ValidationResult,
	validateHa2haV3Workspace,
} from "./v3-validator";
import {
	type Ha2haValidationResult,
	validateHa2haWorkspace,
} from "./validator";

const printUsage = () => {
	process.stderr.write(
		"Usage: ha2ha-validate [--v3] <workspace-dir> [...workspace-dir]\n"
	);
};

const main = async () => {
	const args = process.argv.slice(2);
	const useV3 = args.includes("--v3");
	const workspaceDirs = args.filter((arg) => arg !== "--v3" && arg !== "--");
	if (workspaceDirs.length === 0) {
		printUsage();
		process.exitCode = 2;
		return;
	}

	const results: (Ha2haValidationResult | Ha2haV3ValidationResult)[] =
		await Promise.all(
			workspaceDirs.map((workspaceDir) =>
				useV3
					? validateHa2haV3Workspace(path.resolve(workspaceDir))
					: validateHa2haWorkspace(path.resolve(workspaceDir))
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
