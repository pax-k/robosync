#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

json_field() {
	node -e "const data = JSON.parse(process.argv[1]); console.log(data${2});" "$1"
}

json_assert() {
	node -e "$1" "$2"
}

url_with_path() {
	node -e 'const url = new URL(process.argv[1]); url.pathname = `${url.pathname.replace(/\/$/, "")}/${process.argv[2]}`; console.log(url.toString());' "$1" "$2"
}

expect_status() {
	local expected="$1"
	local method="$2"
	local url="$3"
	local body_file="$4"
	shift 4

	local status
	status="$(curl -sS -X "$method" -o "$body_file" -w "%{http_code}" "$@" "$url")"
	if [ "$status" != "$expected" ]; then
		echo "Expected $expected from $method $url, got $status" >&2
		cat "$body_file" >&2
		exit 1
	fi
}

echo "Creating private editable workspace..."
create_response="$(
	curl -fsS -X POST "$BASE_URL/api/workspaces" \
		-H "Content-Type: application/json" \
		-d '{
			"title": "Backend smoke",
			"readAccess": "token",
			"writeAccess": "token",
			"files": [
				{ "path": "README.md", "content": "# Backend smoke\n" },
				{ "path": "TODO.md", "content": "- [ ] Build backend\n" }
			]
		}'
)"

workspace_id="$(json_field "$create_response" ".id")"
raw_url="$(json_field "$create_response" ".rawUrl")"
edit_url="$(json_field "$create_response" ".editUrl")"
edit_token="$(node -e 'console.log(new URL(JSON.parse(process.argv[1]).editUrl).searchParams.get("edit"))' "$create_response")"

json_assert '
	const data = JSON.parse(process.argv[1]);
	if (!(data.id && data.workspaceUrl && data.rawUrl && data.editUrl)) {
		throw new Error("create response missing expected URLs");
	}
' "$create_response"

echo "Reading raw listing..."
raw_listing="$(curl -fsS "$raw_url")"
grep -q "# ha2ha workspace: $workspace_id" <<<"$raw_listing"
grep -q "README.md" <<<"$raw_listing"
grep -q "TODO.md" <<<"$raw_listing"

echo "Reading raw file with version headers..."
raw_headers="$tmp_dir/raw.headers"
raw_body="$tmp_dir/raw.body"
curl -fsS -D "$raw_headers" -o "$raw_body" "$(url_with_path "$raw_url" "README.md")"
grep -q "# Backend smoke" "$raw_body"
grep -iq "X-HA2HA-File-Version: 1" "$raw_headers"
grep -iq "X-HA2HA-Path: README.md" "$raw_headers"

echo "Reading workspace metadata and tree..."
workspace_response="$(curl -fsS "$BASE_URL/api/workspaces/$workspace_id?edit=$edit_token")"
json_assert '
	const data = JSON.parse(process.argv[1]);
	if (data.readAccess !== "token" || data.writeAccess !== "token") {
		throw new Error("workspace access metadata mismatch");
	}
' "$workspace_response"

tree_response="$(curl -fsS "$BASE_URL/api/workspaces/$workspace_id/tree?edit=$edit_token")"
json_assert '
	const data = JSON.parse(process.argv[1]);
	const paths = data.files.map((file) => file.path).sort();
	if (paths.join(",") !== "README.md,TODO.md") {
		throw new Error(`unexpected tree paths: ${paths.join(",")}`);
	}
' "$tree_response"

echo "Reading JSON file..."
file_response="$(curl -fsS "$BASE_URL/api/workspaces/$workspace_id/files?path=TODO.md&edit=$edit_token")"
version="$(json_field "$file_response" ".version")"
json_assert '
	const data = JSON.parse(process.argv[1]);
	if (data.content !== "- [ ] Build backend\n" || data.version !== 1) {
		throw new Error("unexpected file payload");
	}
' "$file_response"

echo "Updating file with current baseVersion..."
update_response="$(
	curl -fsS -X PUT "$BASE_URL/api/workspaces/$workspace_id/files" \
		-H "Authorization: Bearer $edit_token" \
		-H "Content-Type: application/json" \
		-d "{
			\"path\": \"TODO.md\",
			\"content\": \"- [x] Build backend\\n\",
			\"baseVersion\": $version,
			\"actor\": \"smoke-test\"
		}"
)"
json_assert '
	const data = JSON.parse(process.argv[1]);
	if (data.version !== 2) {
		throw new Error(`expected updated version 2, got ${data.version}`);
	}
' "$update_response"
updated_version="$(json_field "$update_response" ".version")"

echo "Forcing stale update conflict..."
stale_body="$tmp_dir/stale.json"
expect_status 409 PUT "$BASE_URL/api/workspaces/$workspace_id/files" "$stale_body" \
	-H "Authorization: Bearer $edit_token" \
	-H "Content-Type: application/json" \
	-d "{
		\"path\": \"TODO.md\",
		\"content\": \"- [ ] stale write\\n\",
		\"baseVersion\": $version,
		\"actor\": \"smoke-test\"
	}"
json_assert '
	const data = JSON.parse(process.argv[1]);
	if (data.error !== "version_conflict" || data.latest?.version !== 2) {
		throw new Error("expected version_conflict with latest version 2");
	}
' "$(cat "$stale_body")"

echo "Deleting file..."
delete_response="$(
	curl -fsS -X DELETE "$BASE_URL/api/workspaces/$workspace_id/files?path=TODO.md" \
		-H "Authorization: Bearer $edit_token" \
		-H "Content-Type: application/json" \
		-d "{
			\"baseVersion\": $updated_version,
			\"actor\": \"smoke-test\"
		}"
)"
json_assert '
	const data = JSON.parse(process.argv[1]);
	if (data.deleted !== true || data.deletedBy !== "smoke-test") {
		throw new Error("delete did not report success");
	}
' "$delete_response"

echo "Confirming invalid path rejection..."
invalid_body="$tmp_dir/invalid.json"
expect_status 400 POST "$BASE_URL/api/workspaces" "$invalid_body" \
	-H "Content-Type: application/json" \
	-d '{
		"files": [
			{ "path": "../bad.md", "content": "bad" }
		]
	}'
json_assert '
	const data = JSON.parse(process.argv[1]);
	if (data.error !== "invalid_path") {
		throw new Error(`expected invalid_path, got ${data.error}`);
	}
' "$(cat "$invalid_body")"

echo "Backend smoke passed for workspace $workspace_id"
