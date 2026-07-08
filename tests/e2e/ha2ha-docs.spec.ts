import { expect, type Page, test } from "@playwright/test";

const HA2HA_ORIGIN = "http://localhost:5174";

test("HA2HA docs site renders protocol sections and constants", async ({
	page,
}) => {
	const consoleErrors = collectConsoleErrors(page);

	await page.goto(HA2HA_ORIGIN);

	await expect(
		page.getByRole("heading", { level: 1, name: "HA2HA Protocol" })
	).toBeVisible();
	await Promise.all(
		["Workspace", "HTTP", "Schemas", "Examples", "Conformance"].map((section) =>
			expect(page.getByRole("link", { name: section })).toBeVisible()
		)
	);
	await expect(page.getByText("X-HA2HA-File-Version")).toBeVisible();
	await expect(
		page.getByText("/api/workspaces/:workspaceId/events")
	).toBeVisible();
	await expect(page.getByText("file-history", { exact: true })).toBeVisible();
	await expect(page.getByText("abandoned")).toBeVisible();
	expect(consoleErrors).toEqual([]);
});

test("HA2HA docs app supports direct route fallback in dev", async ({
	page,
}) => {
	const consoleErrors = collectConsoleErrors(page);

	await page.goto(`${HA2HA_ORIGIN}/conformance`);

	await expect(
		page.getByRole("heading", { level: 1, name: "HA2HA Protocol" })
	).toBeVisible();
	await expect(page.locator("#conformance")).toBeVisible();
	expect(consoleErrors).toEqual([]);
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
