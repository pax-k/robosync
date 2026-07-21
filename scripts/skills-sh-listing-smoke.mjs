import assert from "node:assert/strict";

const LISTINGS = [
	["ha2ha", "https://www.skills.sh/pax-k/ha2ha-mdsync/ha2ha"],
	["mdsync", "https://www.skills.sh/pax-k/ha2ha-mdsync/mdsync"],
];
const INTERNAL_NOT_FOUND_PATTERN =
	/(?:isn’t|isn't) available in this repository|>404</iu;

const results = await Promise.all(
	LISTINGS.map(async ([skill, url]) => {
		const response = await fetch(`${url}?verification=${Date.now()}`, {
			headers: { "cache-control": "no-cache" },
			redirect: "follow",
		});
		const html = await response.text();
		assert.equal(
			response.status,
			200,
			`${skill} returned HTTP ${response.status}.`
		);
		assert.equal(
			INTERNAL_NOT_FOUND_PATTERN.test(html),
			false,
			`${skill} renders an internal skills.sh 404.`
		);
		assert.ok(html.includes("SKILL.md"), `${skill} does not render SKILL.md.`);
		assert.ok(
			html.includes(`--skill ${skill}`),
			`${skill} does not render its installation command.`
		);
		return { skill, status: "available", url };
	})
);

process.stdout.write(`${JSON.stringify({ ok: true, results }, null, 2)}\n`);
