import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WEB_ORIGIN = "http://localhost:4173";
const GITHUB_URL = "https://github.com/pax-k/ha2ha-mdsync";
const HA2HA_URL = "https://ha2ha.md";
const MDSYNC_SKILL_URL = "https://skills.sh/pax-k/ha2ha-mdsync/mdsync";
const INSTALL_COMMAND = "npx skills add pax-k/ha2ha-mdsync --skill mdsync";
const MDSYNC_TITLE_PATTERN = /MDSync/u;

test.use({ colorScheme: "light" });

test("MDSync root is a developer landing with working public destinations", async ({
	context,
	page,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"], {
		origin: WEB_ORIGIN,
	});
	await page.goto(WEB_ORIGIN);

	await expect(
		page.getByRole("heading", {
			level: 1,
			name: "Markdown workspaces where humans and agents coordinate.",
		})
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "What kind of work is this?" })
	).toHaveCount(0);
	const publicNavigation = page.getByRole("navigation", {
		name: "Public navigation",
	});
	await expect(
		publicNavigation.getByRole("link", { name: "GitHub" })
	).toHaveAttribute("href", GITHUB_URL);
	await expect(
		publicNavigation.getByRole("link", { name: "HA2HA" })
	).toHaveAttribute("href", HA2HA_URL);
	await expect(
		page.getByRole("link", { name: "View the MDSync skill" })
	).toHaveAttribute("href", MDSYNC_SKILL_URL);
	await expect(page).toHaveScreenshot("mdsync-landing.png", {
		animations: "disabled",
		fullPage: true,
	});
	await expectNoSeriousAxeViolations(page);

	await page
		.getByRole("button", { name: "Copy install the MDSync skill" })
		.click();
	await expect(
		page.getByText("Install the MDSync skill copied.")
	).toBeAttached();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		INSTALL_COMMAND
	);
});

test("MDSync install copy explains clipboard failures", async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: {
				writeText: () => Promise.reject(new Error("Clipboard unavailable")),
			},
		});
	});
	await page.goto(WEB_ORIGIN);
	await page
		.getByRole("button", { name: "Copy install the MDSync skill" })
		.click();
	await expect(
		page.getByText("Copy unavailable. Select and copy the command.")
	).toBeVisible();
});

test("MDSync documentation routes are addressable and navigable", async ({
	context,
	page,
}) => {
	const routes = [
		["/docs", "Build a shared place for the work."],
		["/docs/getting-started", "Getting started"],
		["/docs/agent-handoff", "Agent handoff"],
		["/docs/security", "Security"],
	] as const;

	await Promise.all(
		routes.map(async ([route, heading]) => {
			const routePage = await context.newPage();
			await routePage.goto(`${WEB_ORIGIN}${route}`);
			await expect(
				routePage.getByRole("heading", { level: 1, name: heading })
			).toBeVisible();
			await expect(routePage).toHaveTitle(MDSYNC_TITLE_PATTERN);
			await expectNoSeriousAxeViolations(routePage);
			await routePage.close();
		})
	);

	await page.goto(`${WEB_ORIGIN}/docs/getting-started`);
	await page.getByRole("link", { name: "Agent handoff" }).click();
	await expect(page).toHaveURL(`${WEB_ORIGIN}/docs/agent-handoff`);
	await page.goBack();
	await expect(page).toHaveURL(`${WEB_ORIGIN}/docs/getting-started`);
	await page.goto(`${WEB_ORIGIN}/docs`);
	await expect(page.locator('meta[name="description"]')).toHaveAttribute(
		"content",
		"Developer documentation for publishing, sharing, and coordinating through MDSync."
	);
	await expect(page).toHaveScreenshot("mdsync-docs.png", {
		animations: "disabled",
		fullPage: true,
	});
	await page.goto(`${WEB_ORIGIN}/not-a-public-route`);
	await expect(page).toHaveURL(`${WEB_ORIGIN}/`);
	await expect(
		page.getByRole("heading", {
			level: 1,
			name: "Markdown workspaces where humans and agents coordinate.",
		})
	).toBeVisible();
});

test("public landing and docs preserve focused mobile navigation", async ({
	page,
}) => {
	await page.setViewportSize({ height: 844, width: 390 });
	await page.goto(WEB_ORIGIN);
	await expect(
		page.getByRole("banner").getByRole("link", { name: "Create workspace" })
	).toBeVisible();
	await expect(page.locator("html")).not.toHaveCSS("overflow-x", "scroll");
	await expect(page).toHaveScreenshot("mdsync-public-mobile.png", {
		animations: "disabled",
		fullPage: true,
	});

	await page.goto(`${WEB_ORIGIN}/docs/security`);
	await expect(
		page.getByRole("navigation", { name: "Documentation navigation" })
	).toBeVisible();
	const hasHorizontalOverflow = await page.evaluate(
		() =>
			document.documentElement.scrollWidth >
			document.documentElement.clientWidth
	);
	expect(hasHorizontalOverflow).toBe(false);
	await expectNoSeriousAxeViolations(page);
});

async function expectNoSeriousAxeViolations(
	page: import("@playwright/test").Page
) {
	const results = await new AxeBuilder({ page }).analyze();
	const serious = results.violations.filter((violation) =>
		["critical", "serious"].includes(violation.impact ?? "")
	);
	expect(serious).toEqual([]);
}
