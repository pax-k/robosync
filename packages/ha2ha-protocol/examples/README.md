# HA2HA Protocol Examples

These fixtures are portable HA2HA v1 examples. They must not require MDSync
server, web, Cloudflare, D1, R2, Better Auth, Next.js, or Hono.

v3 fixtures extend the same portable file substrate with optional collaboration
profiles. They remain protocol fixtures and do not depend on MDSync product
routes, hosted identity, provider APIs, or private agent harness state.

## Valid

- `valid/minimal-workspace`: core workspace convention, actor-attributed file
  write request, minimal task claim request, and minimal evidence metadata.
- `valid/multi-participant-task-workspace`: multiple participants coordinating
  through versioned task files.
- `valid/event-history-workspace`: declared event and file-history profile
  records for import/export preservation checks.
- `valid/v3-coordination-only`: a workspace claiming only the v3 coordination
  profile with task claim and handoff records.
- `valid/v3-trust-only`: a workspace claiming only the v3 trust profile with
  participant authority and delegation records.
- `valid/v3-evidence-review-only`: a workspace claiming only the v3
  evidence/review profile with evidence, review, question, and approval records.
- `valid/v3-engineering-only`: a workspace claiming only the v3 engineering
  profile with portable repository and check references.
- `valid/v3-governance-only`: a workspace claiming only the v3 governance
  profile with audit events, policy gates, and audit export preservation.
- `valid/v3-methods-only`: a workspace claiming only the v3 methods profile
  with the first-slice method contracts.
- `valid/v3-engineering-team-workspace`: the v3 dogfood pilot fixture proving
  two agent contexts and one human reviewer can coordinate through portable
  claims, handoffs, evidence, review, approval, checks, audit, and engineering
  references.

## Invalid

- `invalid/missing-manifest`: omits `.ha2ha/workspace.json`.
- `invalid/invalid-task-state`: uses a task state outside the v1 vocabulary.
- `invalid/invalid-evidence-metadata`: omits required evidence metadata.
- `invalid/invalid-target-coordinate`: uses a non-normalized target path and
  invalid version.
- `invalid/missing-actor-file-write`: omits the required mutating actor.
- `invalid/invalid-claim-metadata`: omits required claim `owner` and
  `updated_by`.
- `invalid/invalid-conflict-response`: omits the latest versioned target
  coordinate fields required by conflict responses.
- `invalid/v3-missing-required-method`: claims v3 methods while omitting one of
  the required first-slice method contracts.
- `invalid/v3-blocked-completion`: marks a task done while evidence, approval,
  review, and required check gates remain unresolved.
- `invalid/v3-provider-payload-leak`: embeds provider-private payload state in a
  portable engineering profile record.
- `invalid/v3-secret-leak`: stores a raw token-like value in portable workspace
  frontmatter.
