# Local Folder Workflows

Use local-folder mode when the HA2HA workspace is a directory on disk.

1. Read `HA2HA.md`, `STATUS.md`, `.ha2ha/workspace.json`, the relevant
   `participants/<handle>.md`, target task, and linked evidence.
2. Run `ha2ha-validate <workspace-dir>` when available.
3. Mutate only the declared allowed paths.
4. Preserve existing frontmatter, body text, and evidence links unless the task
   specifically asks to change them.
5. If `.ha2ha/file-versions.json` or `.ha2ha/workspace-events.json` exists,
   preserve valid JSON arrays and keep records compatible with HA2HA v1 schemas.
6. Run validation again after edits and write evidence for meaningful checks.

Local filesystem writes do not automatically prove HTTP-profile conflict
semantics. Only claim `baseVersion` behavior when a local adapter, client, or
conformant implementation supplies version checks.
