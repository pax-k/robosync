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
			command:
				"VITE_API_BASE_URL=http://localhost:4300 pnpm --filter web exec vite --host 0.0.0.0 --port 4173 --strictPort",
			reuseExistingServer: false,
			timeout: 30_000,
			url: "http://localhost:4173",
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
