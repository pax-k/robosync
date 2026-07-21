# v0 Agent Skill And Scripts

## Purpose

The MDSync agent workflow lets an agent publish Markdown files and workspaces without manual copy-paste.

v0 focuses on upload, read, and update behavior for the MDSync demo/reference implementation. Full HA2HA agent workflow and conformance belongs to v1.

## Skill Trigger

The workflow should apply when the user asks an agent to:

- share Markdown output
- publish a report
- upload generated docs
- create a preview link
- share a todo list or status file
- update an existing MDSync workspace

## Required Scripts

### Upload Single File

```txt
scripts/upload-file.mjs <file> [--path <path>] [--title <title>] [--public|--private] [--editable|--readonly]
```

This creates a workspace with one file. The file should be uploaded as `README.md` by default unless `--path` is provided.

### Upload Workspace

```txt
scripts/upload-workspace.mjs <directory> [--title <title>] [--public|--private] [--editable|--readonly]
```

This uploads supported Markdown/text files under the directory and preserves relative paths.

### Update File

```txt
scripts/update-file.mjs <workspace-id> <path> <file> --token <write-token> --base-version <version> --actor <actor>
```

This updates one file and preserves the optimistic concurrency and actor
attribution contract.

## Output

After upload, the agent should return:

```txt
Human preview: https://sync.ha2ha.md/w/abc123?k=...
Agent raw listing: https://sync-api.ha2ha.md/w/abc123/raw?k=...
Edit link: https://sync.ha2ha.md/w/abc123?edit=...
```

If the workspace is read-only, omit the edit link.

## Read Workflow

When an agent receives a MDSync workspace link:

1. Prefer the raw listing URL.
2. Fetch `/w/:id/raw` to inspect files.
3. Fetch only the files needed for the task.
4. Preserve paths when referring to files.
5. Use the JSON tree API if the agent needs versions for multiple files.

## Update Workflow

When an agent updates a workspace:

1. Fetch the target file.
2. Record the current file version from headers or the JSON API.
3. Make the smallest useful edit.
4. Submit the update with `baseVersion` and a stable actor handle.
5. If the API returns `409 Conflict`, read the latest content.
6. Merge the intended change.
7. Retry once.
8. If the second attempt conflicts, stop and report the conflict to the user.

## Token Handling

The scripts should avoid printing edit tokens unless the user needs the edit link. When scripts need write access, prefer:

```txt
Authorization: Bearer <write-token>
```

For browser edit links, query parameters are acceptable:

```txt
https://sync.ha2ha.md/w/abc123?edit=<write-token>
```

## Environment

Scripts should read the base URL from:

```txt
MDSYNC_BASE_URL
```

Default for development:

```txt
http://localhost:3000
```

Optional write token:

```txt
MDSYNC_WRITE_TOKEN
```

Optional actor for update-script attribution:

```txt
MDSYNC_ACTOR
```

Optional web origin override for update-script edit links:

```txt
MDSYNC_WEB_URL
```

v0 does not require a global API key, but this variable can be useful for local private deployments later.
