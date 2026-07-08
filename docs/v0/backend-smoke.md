# Backend Smoke Test

Use this after `pnpm run dev` starts the server at `http://localhost:3000`.

```bash
scripts/smoke-backend.sh
```

To test another server URL:

```bash
BASE_URL="https://example.com" scripts/smoke-backend.sh
```

For a backend-only Cloudflare deployment, use:

```bash
pnpm run deploy:server
BASE_URL="<server-url-from-deploy-output>" scripts/smoke-backend.sh
```

The manual curl flow below mirrors the executable script.

```bash
BASE_URL="${BASE_URL:-http://localhost:3000}"

CREATE_RESPONSE="$(
  curl -sS -X POST "$BASE_URL/api/workspaces" \
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

echo "$CREATE_RESPONSE"

WORKSPACE_ID="$(node -e 'console.log(JSON.parse(process.argv[1]).id)' "$CREATE_RESPONSE")"
RAW_URL="$(node -e 'console.log(JSON.parse(process.argv[1]).rawUrl)' "$CREATE_RESPONSE")"
RAW_FILE_URL="$(node -e 'const url = new URL(process.argv[1]); url.pathname += "/README.md"; console.log(url.toString())' "$RAW_URL")"
EDIT_TOKEN="$(node -e 'console.log(new URL(JSON.parse(process.argv[1]).editUrl).searchParams.get("edit"))' "$CREATE_RESPONSE")"

curl -sS "$RAW_URL"
curl -sS -D - "$RAW_FILE_URL"

FILE_RESPONSE="$(
  curl -sS "$BASE_URL/api/workspaces/$WORKSPACE_ID/files?path=TODO.md&edit=$EDIT_TOKEN"
)"

echo "$FILE_RESPONSE"

VERSION="$(node -e 'console.log(JSON.parse(process.argv[1]).version)' "$FILE_RESPONSE")"

curl -sS -X PUT "$BASE_URL/api/workspaces/$WORKSPACE_ID/files" \
  -H "Authorization: Bearer $EDIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"path\": \"TODO.md\",
    \"content\": \"- [x] Build backend\\n\",
    \"baseVersion\": $VERSION,
    \"actor\": \"smoke-test\"
  }"

curl -sS -X PUT "$BASE_URL/api/workspaces/$WORKSPACE_ID/files" \
  -H "Authorization: Bearer $EDIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"path\": \"TODO.md\",
    \"content\": \"- [ ] stale write\\n\",
    \"baseVersion\": $VERSION,
    \"actor\": \"smoke-test\"
  }"

curl -sS -X DELETE "$BASE_URL/api/workspaces/$WORKSPACE_ID/files?path=TODO.md" \
  -H "Authorization: Bearer $EDIT_TOKEN"

curl -sS -X POST "$BASE_URL/api/workspaces" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      { "path": "../bad.md", "content": "bad" }
    ]
  }'
```

Expected checks:

- Create returns `workspaceUrl`, `rawUrl`, and `editUrl`.
- Raw listing includes `README.md` and `TODO.md`.
- Raw file returns Markdown with `X-HA2HA-File-Version`.
- First update succeeds and increments the version.
- Second update returns `409 version_conflict`.
- Delete returns `{ "deleted": true }`.
- Invalid path returns `400 invalid_path`.
