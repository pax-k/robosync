declare module "*.mjs" {
	export interface MdsyncMockServer {
		close: () => Promise<void>;
		start: () => Promise<{ baseUrl: string }>;
	}

	export const createMdsyncMockServer: () => MdsyncMockServer;
}
