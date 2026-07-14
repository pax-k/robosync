---
id: V2-012
title: Ship URL-based HA2HA agent handoff
version: v2
state: blocked
priority: high
depends_on: [V1-011, V2-009, V2-010, V2-011]
area: agent-adoption
acceptance:
  - Web and API deployments publish the same strict, secret-free MDSync discovery contract.
  - The public client parses supported workspace URLs safely and bootstraps a least-privilege connection without forwarding capability queries to discovery.
  - Agent publishing atomically creates a complete HA2HA 1.0.0 workspace and returns labelled Viewer and Collaborator links.
  - Installed MDSync skills publish through createHa2haWorkspace and join through createMdsyncClientFromUrl without repo-local scripts.
  - A two-agent smoke proves read-only inspection, collaborator claim/evidence/status updates, observation, conflict preservation, and capability redaction.
  - Product activity combines protocol events and comment lifecycle items without changing portable HA2HA event surfaces.
  - The skills package exposes a built runtime adapter that resolves when it is the consumer's only direct dependency.
  - Public packages have public metadata, correct runtime dependencies, verified tarballs, and a clean-consumer installation proof before latest promotion.
  - The public GitHub repository exposes exactly the supported ha2ha and mdsync skills, with production Cloudflare discovery guidance and no legacy alpha skill.
evidence:
  - "2026-07-14: Added strict discovery contracts and matching Web/API well-known endpoints with configured custom-domain failure behavior."
  - "2026-07-14: Added safe workspace URL parsing, discovery bootstrap, separate Web/API origins, and URL-only client tests for every supported route and capability mode."
  - "2026-07-14: Added atomic HA2HA creation validation and generation before persistence, including canonical manifest, guide, status, participant, task, and evidence validation."
  - "2026-07-14: Updated the installable MDSync skill and package smokes to publish and join through the public URL handoff APIs without writing capability URLs into evidence."
  - "2026-07-14: Green release proof: HA2HA protocol 15/15, MDSync contracts 8/8, server 17/17, MDSync client 6/6, Web 17/17, installed client and skill package smokes, Playwright 11/11, Ultracite, repo type checks, and production builds."
  - "2026-07-14: Local Alchemy proof passed with matching Web/API discovery and a URL-only two-agent handoff against http://localhost:5173 and http://localhost:3200."
  - "2026-07-14: Deployed the full Alchemy pax stack to Cloudflare; both public discovery endpoints agree and the deployed URL-only two-agent handoff passed without capability leakage."
  - "2026-07-14: All six 0.1.0 public tarball manifests and contents were inspected in dependency order. npm publication is blocked because npm whoami returns E401 for the current environment."
  - "2026-07-14: Dogfood hardening added a read-safe combined activity projection, comment lifecycle visibility in Overview, strict manifest validation, and unchanged portable /events and /raw/events behavior."
  - "2026-07-14: @mdsync/skills/runtime now owns agent bootstrap and manifest helpers; the clean consumer declares only @mdsync/skills under isolated pnpm resolution."
  - "2026-07-14: Added a manual four-context Codex release harness with a mode-0600 handoff file, finally cleanup, structured redacted output, conflict proof, and capability scans over agent output, workspace files, and comments."
  - "2026-07-14: Fixed the Codex harness stdin deadlock by closing the child process input and using JSON event mode. Two consecutive local runs passed all four real Codex CLI contexts: publisher, viewer, collaborator-reviewer, and conflict."
  - "2026-07-14: Dogfood exposed shared-stage deletion when local Alchemy server-only development reused stage pax. Local dev is now pinned to stage local, server-only deploy is a safe full-stack compatibility alias, and Cloudflare Web/HA2HA/API resources were restored."
  - "2026-07-14: After restoration, matching hosted discovery and the full four-context real Codex CLI dogfood passed against Cloudflare with capabilityFileMode 0600 and capabilityLeak false."
  - "2026-07-14: Repaired pnpm run dev:server, which previously executed zero Turbo tasks; it now starts the isolated local-stage server on 127.0.0.1:3200."
  - "2026-07-14: Aligned the public ha2ha and mdsync skills with MIT metadata, one-level references, public package repository metadata, and the canonical Cloudflare Web, API, and protocol-doc origins."
  - "2026-07-14: Public skill verification passes 4/4 and repository discovery returns exactly ha2ha and mdsync; the historical core alpha is retained as a non-discoverable reference."
  - "2026-07-14: Gitleaks 8.30.1 found no secrets in the public working-tree projection or all 14 Git commits after narrowly allowlisting the two intentional protocol secret-leak fixtures."
  - "2026-07-14: Production URL handoff passed with capabilityLeak false, comment lifecycle coverage, protocol-only events, and preserved version_conflict; four-context Codex dogfood also passed with capabilityFileMode 0600 and capabilityLeak false."
---

# V2-012 URL-Based HA2HA Agent Handoff

## Intent

Make MDSync links the complete agent handoff boundary. Agent A can publish a
portable HA2HA workspace and return Viewer and Collaborator URLs once. Agent B
can receive only one pasted URL, discover the deployment, validate the
workspace, and coordinate through HA2HA tasks and evidence.

V2-009 remains the completed package foundation. This task closes the public
authorization, URL discovery, conformant publishing, runtime dependency, and
external distribution gaps.

## Public Boundary

- `GET /.well-known/mdsync.json` contains only product, discovery version, API
  origin, and Web origin.
- `createMdsyncClientFromUrl()` accepts supported workspace, file, activity,
  settings, work, and raw links, but rejects ambiguous or unsafe URLs.
- `createHa2haWorkspace()` validates a complete virtual file set before any D1
  or R2 mutation and reserves `.ha2ha/workspace.json` for server generation.
- Viewer URLs grant inspection only. Collaborator URLs are required for task
  claims, evidence, comments, resolutions, and writes.
- Installing the skill grants no workspace authority. Both URLs are bearer
  capabilities and must stay out of files, comments, evidence, commands, logs,
  telemetry, and diagnostics.
- `listActivity()` is the MDSync product feed and includes derived comment
  lifecycle items. `listEvents()` and `/raw/events` remain HA2HA-only.
- `validateMdsyncHa2haManifest()` requires protocol `ha2ha`, version `1.0.0`,
  conflict policy `baseVersion-required`, and the connected workspace ID.

## Public Skill Release

- Publish `ha2ha` and `mdsync` together from `pax-k/robosync` under release
  `v0.1.0`.
- Use `https://mdsync-web-pax.pax.workers.dev/.well-known/mdsync.json` as the
  production publishing discovery entrypoint. Joining remains driven by the
  pasted workspace URL.
- Keep the historical core alpha reference non-discoverable. Repository skill
  discovery must return exactly `ha2ha` and `mdsync`.
- skills.sh installation remains usable through the HTTP fallback before npm
  scope authentication is available.

## Distribution Gate

Publish version `0.1.0` under `next` in dependency order only after the deployed
API supports these contracts. Promote those exact versions to `latest` only
after a clean external install succeeds. Registry publication requires an npm
identity that controls both the `@ha2ha` and `@mdsync` scopes; no automation may
create organizations or change ownership.

## Verification

```bash
pnpm dlx ultracite fix
pnpm --filter @ha2ha/protocol test
pnpm --filter @mdsync/contracts test
pnpm --filter server test
pnpm --filter @mdsync/client test
node scripts/mdsync-client-package-smoke.mjs
pnpm --filter @mdsync/skills test
node scripts/mdsync-skill-package-smoke.mjs
pnpm run test:public-skills
pnpm --filter web test
pnpm run test:mdsync-handoff
pnpm run test:e2e
pnpm run check
pnpm run check-types
pnpm run build
```

Run the URL-only handoff against both local and deployed services:

```bash
MDSYNC_BASE_URL=http://127.0.0.1:3200 pnpm run test:mdsync-handoff
MDSYNC_BASE_URL=https://mdsync-server-pax.pax.workers.dev pnpm run test:mdsync-handoff
```

Run the stochastic four-context release proof manually after deterministic
checks pass:

```bash
MDSYNC_BASE_URL=https://mdsync-server-pax.pax.workers.dev pnpm run test:mdsync-codex-dogfood
```
