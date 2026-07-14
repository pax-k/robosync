import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const TRAILING_SLASH_PATTERN = /\/$/u;
const discoveryTarget =
	process.env.VITE_API_BASE_URL?.replace(TRAILING_SLASH_PATTERN, "") ??
	"http://localhost:3000";

export default defineConfig({
	plugins: [react()],
	server: {
		host: "0.0.0.0",
		port: 5173,
		proxy: {
			"/.well-known/mdsync.json": discoveryTarget,
		},
	},
});
