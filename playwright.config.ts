import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	expect: {
		timeout: 10_000,
	},
	fullyParallel: false,
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	reporter: "list",
	testDir: "tests/e2e",
	timeout: 30_000,
	use: {
		trace: "on-first-retry",
	},
	webServer: [
		{
			command: "pnpm --filter web run dev:bare",
			reuseExistingServer: true,
			timeout: 30_000,
			url: "http://localhost:5173",
		},
		{
			command: "pnpm --filter ha2ha run dev",
			reuseExistingServer: true,
			timeout: 30_000,
			url: "http://localhost:5174",
		},
	],
	workers: 1,
});
