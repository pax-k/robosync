import assert from "node:assert/strict";
import test from "node:test";
import {
	MDSYNC_SKILL_INSTALL,
	PUBLIC_DOCS,
	PUBLIC_LINKS,
	PUBLIC_PAGE_METADATA,
} from "./public-content";

const CAPABILITY_PATTERN = /[?&](?:edit|k)=[A-Za-z0-9_-]{16,}/u;

test("public content uses canonical production and skills links", () => {
	assert.deepEqual(PUBLIC_LINKS, {
		github: "https://github.com/pax-k/ha2ha-mdsync",
		ha2haDocs: "https://ha2ha.md",
		ha2haSkill: "https://skills.sh/pax-k/ha2ha-mdsync/ha2ha",
		mdsyncSkill: "https://skills.sh/pax-k/ha2ha-mdsync/mdsync",
	});
	assert.equal(
		MDSYNC_SKILL_INSTALL,
		"npx skills add pax-k/ha2ha-mdsync --skill mdsync"
	);
});

test("public documentation and metadata are addressable and capability-free", () => {
	assert.deepEqual(
		PUBLIC_DOCS.map((item) => item.href),
		["/docs/getting-started", "/docs/agent-handoff", "/docs/security"]
	);
	const serializedContent = JSON.stringify({
		PUBLIC_DOCS,
		PUBLIC_LINKS,
		PUBLIC_PAGE_METADATA,
	});
	assert.equal(CAPABILITY_PATTERN.test(serializedContent), false);
	for (const metadata of Object.values(PUBLIC_PAGE_METADATA)) {
		assert.ok(metadata.title.length > 0);
		assert.ok(metadata.description.length > 0);
	}
});
