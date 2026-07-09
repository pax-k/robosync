export interface MdsyncWorkerBindings {
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
	CORS_ORIGIN: string;
	DB: D1Database;
	FILES: R2Bucket;
	WEB_ORIGIN?: string | null;
}
