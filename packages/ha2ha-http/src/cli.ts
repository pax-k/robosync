#!/usr/bin/env node
import {
	formatConformanceResult,
	runHa2haHttpConformance,
} from "./conformance";

const main = async () => {
	const baseUrl = process.env.HA2HA_BASE_URL ?? process.argv[2];
	if (!baseUrl) {
		process.stderr.write(
			"Usage: HA2HA_BASE_URL=http://localhost:3000 ha2ha-http-conformance\n"
		);
		process.exitCode = 2;
		return;
	}

	const result = await runHa2haHttpConformance({ baseUrl });
	process.stdout.write(`${formatConformanceResult(result)}\n`);
	process.exitCode = result.ok ? 0 : 1;
};

await main();
