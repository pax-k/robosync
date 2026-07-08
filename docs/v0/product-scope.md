# v0 Product Scope

## Problem

AI agents frequently produce Markdown artifacts that need to be shared outside the local repo or chat thread. Today the user often needs to copy generated Markdown, paste it into another tool, configure sharing, and send the link manually.

MDSync removes that manual step. The agent can upload Markdown directly and return links that are useful to humans and other agents.

## Positioning

MDSync is the first product implementation of HA2HA. v0 is the foundation and demo implementation, not full protocol conformance.

For humans, MDSync behaves like a simple Markdown preview/editor with a workspace file tree. For agents, MDSync exposes stable raw Markdown routes with explicit file versions and conflict responses.

## MVP

The MVP supports:

- creating a workspace with one or more Markdown files
- reading a raw workspace directory listing
- reading raw file contents
- previewing a workspace in a browser
- editing files in the browser when the visitor has an edit capability
- updating files by API when the caller has an edit capability
- optimistic concurrency for file updates

## Workspace Model

A workspace is the primary resource. It contains files addressed by slash-separated paths.

Example:

```txt
README.md
STATUS.md
tasks/RS-001.md
evidence/test-output.md
```

Folders do not need separate records in v0. They are inferred from file paths. Single-file sharing is a workspace with one file, usually `README.md`.

## Permissions

MDSync v0 has no identity system. It uses capability links:

- Public readable: anyone with the workspace URL can read.
- Token readable: read requires a read token in the URL.
- Public editable: anyone with the workspace URL can edit.
- Token editable: write requires an edit token or bearer token.
- Read-only: no write capability exists.

This is not identity-based privacy. Anyone with a capability token can use it.

## Storage

MDSync v0 stores file bytes in R2 and workspace/file metadata in D1.

D1 is the canonical index for workspace existence, access settings, file paths, current file versions, object keys, size, hash, content type, timestamps, and update actor. R2 stores the Markdown bytes and future binary file bytes. R2 object listing must not be used as the workspace tree.

## Demo Coordination

v0 can include HA2HA-inspired workspace templates such as:

```txt
README.md
STATUS.md
tasks/
evidence/
decisions/
logs/
```

These templates help prove agent coordination, but v0 does not enforce the full HA2HA workspace convention.

## UX Principles

- Agents get raw, deterministic routes.
- Humans get a clean browser UI with navigation and rendered Markdown.
- The workspace tree is visible immediately.
- Editing is obvious when an edit token is present and absent otherwise.
- Conflicts are explicit and never silently resolved.

## User Flows

### Publish One Markdown File

1. Agent writes `README.md` locally.
2. Agent runs the MDSync upload script.
3. Script creates a workspace with one file.
4. Agent returns a human preview link and raw file link.

### Publish A Workspace

1. Agent writes multiple Markdown files in a local folder.
2. Agent uploads the folder, preserving relative paths.
3. MDSync returns a workspace URL and raw listing URL.
4. Humans browse the workspace in the browser.
5. Agents fetch the raw listing and specific files.

### Coordinate Multiple Agents

1. First agent creates a coordination workspace.
2. Agent shares the raw listing URL and edit capability with another agent.
3. Agents read status and task files before editing.
4. Agents update files with `baseVersion`.
5. If a conflict occurs, the agent re-reads, merges, and retries once.

## Explicitly Deferred

v0 excludes `workspace_events`, durable `workspace_file_versions`, comments, users, sessions, `file_locks`, per-workspace D1, encryption, protocol validators, and conformance suites.
