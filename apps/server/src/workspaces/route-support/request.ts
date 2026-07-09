export function parseOptionalJson(request: Request) {
	const contentType = request.headers.get("Content-Type");
	if (!contentType?.includes("application/json")) {
		return {};
	}
	return request.json();
}
