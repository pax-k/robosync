const TRAILING_SLASH_PATTERN = /\/$/u;

export const authHeaders = (editToken: string) => ({
	Authorization: `Bearer ${editToken}`,
	"Content-Type": "application/json",
});

export const normalizeBaseUrl = (baseUrl: string) =>
	baseUrl.replace(TRAILING_SLASH_PATTERN, "");

export const encodePath = (filePath: string) =>
	filePath.split("/").map(encodeURIComponent).join("/");

export const readJson = async (response: Response): Promise<unknown> => {
	try {
		return await response.json();
	} catch {
		return null;
	}
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const getString = (value: unknown, key: string): string | null => {
	if (!isRecord(value)) {
		return null;
	}
	const field = value[key];
	return typeof field === "string" ? field : null;
};

export const getNumber = (value: unknown, key: string): number => {
	if (!isRecord(value)) {
		throw new Error(`Expected object with numeric ${key}.`);
	}
	const field = value[key];
	if (typeof field !== "number") {
		throw new Error(`Expected numeric ${key}.`);
	}
	return field;
};

export const getArray = (value: unknown, key: string): unknown[] => {
	if (!isRecord(value)) {
		throw new Error(`Expected object with array ${key}.`);
	}
	const field = value[key];
	if (!Array.isArray(field)) {
		throw new Error(`Expected array ${key}.`);
	}
	return field;
};

export const findRecord = (
	values: unknown[],
	key: string,
	expectedValue: number | string
): Record<string, unknown> => {
	const record = values.find(
		(value) => isRecord(value) && value[key] === expectedValue
	);
	if (!isRecord(record)) {
		throw new Error(`Expected record with ${key} ${String(expectedValue)}.`);
	}
	return record;
};

export const getVersion = (value: unknown): number =>
	getNumber(value, "version");

export const assertStatus = (response: Response, expectedStatus: number) => {
	if (response.status !== expectedStatus) {
		throw new Error(`Expected HTTP ${expectedStatus}, got ${response.status}.`);
	}
};

export const assertHeaderEquals = (
	response: Response,
	header: string,
	expectedValue: string
) => {
	const value = response.headers.get(header);
	if (value !== expectedValue) {
		throw new Error(`Expected ${header} ${expectedValue}, got ${value}.`);
	}
};

export const assertHeaderIncludes = (
	response: Response,
	header: string,
	expectedValue: string
) => {
	const value = response.headers.get(header);
	if (!value?.includes(expectedValue)) {
		throw new Error(`Expected ${header} to include ${expectedValue}.`);
	}
};

export const assertIncludes = (value: string, expected: string) => {
	if (!value.includes(expected)) {
		throw new Error(`Expected value to include ${expected}.`);
	}
};

export const assertEquals = (actual: unknown, expected: unknown) => {
	if (actual !== expected) {
		throw new Error(`Expected ${String(expected)}, got ${String(actual)}.`);
	}
};

export const requireString = (value: unknown, label: string): string => {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`Expected ${label}.`);
	}
	return value;
};

export const assertPositiveNumber = (value: number, label: string) => {
	if (!(Number.isInteger(value) && value > 0)) {
		throw new Error(`Expected positive integer ${label}.`);
	}
};
