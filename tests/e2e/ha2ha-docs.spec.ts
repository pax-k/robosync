import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const HA2HA_ORIGIN = "http://localhost:5174";
const INTERNAL_VERSION_PATTERN = /\bv[1-3]\b/iu;

test("HA2HA presents the current protocol without internal version labels", async ({
	page,
}) => {
	const consoleErrors = collectConsoleErrors(page);

	await page.goto(HA2HA_ORIGIN);

	await expect(
		page.getByRole("heading", { level: 1, name: "HA2HA" })
	).toBeVisible();
	await expect(
		page.getByText(
			"A simple, open protocol for human-agent teams working together."
		)
	).toBeVisible();
	const mainNavigation = page.getByRole("navigation", {
		name: "Main navigation",
	});
	await Promise.all(
		["Why HA2HA", "Protocol", "Adopt", "Conformance", "MDSync"].map((section) =>
			expect(
				mainNavigation.getByRole("link", { exact: true, name: section })
			).toBeVisible()
		)
	);

	await Promise.all(
		[
			"Coordination",
			"Trust and authority",
			"Evidence and review",
			"Governance and audit",
			"Engineering references",
			"Transport and validation",
		].map((heading) =>
			expect(
				page.getByRole("heading", { level: 3, name: heading })
			).toBeVisible()
		)
	);

	await expect(page.getByText("baseVersion:")).toBeVisible();
	await expect(
		page
			.getByRole("list", { name: "Transport and validation protocol terms" })
			.getByText("version_conflict", { exact: true })
	).toBeVisible();
	await expect(page.getByText("task.claim", { exact: true })).toBeVisible();
	await expect(
		page.getByText("npx skills add pax-k/ha2ha-mdsync --skill ha2ha")
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "HA2HA Core 1.0" })
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Extended collaboration profiles" })
	).toBeVisible();
	await expect(
		page.getByRole("heading", {
			level: 2,
			name: "The first HA2HA implementation.",
		})
	).toBeVisible();
	await expect(page).toHaveScreenshot("ha2ha-public.png", {
		animations: "disabled",
		fullPage: true,
	});
	await expectNoSeriousAxeViolations(page);

	const visibleText = await page.locator("body").innerText();
	expect(visibleText).not.toMatch(INTERNAL_VERSION_PATTERN);
	expect(consoleErrors).toEqual([]);
});

test("public destinations link to GitHub, skills, and MDSync", async ({
	page,
}) => {
	await page.goto(HA2HA_ORIGIN);

	await expect(
		page.getByRole("link", { name: "GitHub" }).first()
	).toHaveAttribute("href", "https://github.com/pax-k/ha2ha-mdsync");
	await expect(
		page.getByRole("link", { name: "Install skill" })
	).toHaveAttribute("href", "https://skills.sh/pax-k/ha2ha-mdsync/ha2ha");
	await expect(
		page.getByRole("link", { name: "Explore MDSync" })
	).toHaveAttribute("href", "https://mdsync-web-pax.pax.workers.dev");
});

test("copy controls announce success without console errors", async ({
	context,
	page,
}) => {
	const consoleErrors = collectConsoleErrors(page);
	await context.grantPermissions(["clipboard-read", "clipboard-write"], {
		origin: HA2HA_ORIGIN,
	});
	await page.goto(HA2HA_ORIGIN);

	await page
		.getByRole("button", { name: "Copy HA2HA skill install command" })
		.click();
	await expect(
		page.getByText("Copied HA2HA skill install command.")
	).toBeVisible();
	expect(consoleErrors).toEqual([]);
});

test("copy controls explain clipboard failures without console errors", async ({
	page,
}) => {
	const consoleErrors = collectConsoleErrors(page);
	await page.addInitScript(() => {
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: {
				writeText: () => Promise.reject(new Error("Clipboard unavailable")),
			},
		});
	});
	await page.goto(HA2HA_ORIGIN);

	await page
		.getByRole("button", { name: "Copy HA2HA skill install command" })
		.click();
	await expect(
		page.getByText("Copy unavailable. Select and copy the command.")
	).toBeVisible();
	expect(consoleErrors).toEqual([]);
});

test("HA2HA docs app supports direct route fallback", async ({ page }) => {
	const consoleErrors = collectConsoleErrors(page);

	await page.goto(`${HA2HA_ORIGIN}/conformance`);

	await expect(
		page.getByRole("heading", { level: 1, name: "HA2HA" })
	).toBeVisible();
	await expect(page.locator("#conformance")).toBeVisible();
	expect(consoleErrors).toEqual([]);
});

test("mobile layout preserves heading order without horizontal overflow", async ({
	page,
}) => {
	await page.setViewportSize({ height: 844, width: 390 });
	await page.goto(HA2HA_ORIGIN);

	const headings = await page.locator("h1, h2").allTextContents();
	expect(headings[0]).toBe("HA2HA");
	expect(headings).toContain("Files are the contract.");
	expect(headings).toContain("The first HA2HA implementation.");

	const hasHorizontalOverflow = await page.evaluate(
		() =>
			document.documentElement.scrollWidth >
			document.documentElement.clientWidth
	);
	expect(hasHorizontalOverflow).toBe(false);
	await expectNoSeriousAxeViolations(page);
});

function collectConsoleErrors(page: Page) {
	const errors: string[] = [];
	page.on("console", (message) => {
		if (message.type() === "error") {
			errors.push(message.text());
		}
	});
	page.on("pageerror", (error) => {
		errors.push(error.message);
	});
	return errors;
}

async function expectNoSeriousAxeViolations(page: Page) {
	const results = await new AxeBuilder({ page }).analyze();
	const serious = results.violations.filter((violation) =>
		["critical", "serious"].includes(violation.impact ?? "")
	);
	expect(serious).toEqual([]);
}
