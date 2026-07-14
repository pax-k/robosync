# V3-DR-006 Skills Scripts And Harness Adapters

## Owner

HA2HA protocol maintainer.

## Scope

First-party skill packaging, bundled scripts, compatibility policy, adapter
sequence, named harnesses, provider-sync readiness, and MDSync versus HA2HA
package boundaries.

## Open Questions Covered

- Which first-party adapter ships first.
- Whether first-party tools expose both protocol mode and MDSync mode.
- Whether HA2HA and MDSync skills ship as one package or separate packages.
- Whether bundled scripts live in product repo, future tools package, or skill
  bundles.
- What compatibility promise scripts and adapters carry.
- Which profiles must exist before provider-sync adapters are marketed.

## Options

- Ship one generic package that mixes protocol and hosted product behavior.
- Make every agent harness a protocol dependency.
- Keep HA2HA protocol skills/packages separate from MDSync product skills and
  hosted adapters.
- Delay all skills until provider-sync exists.

## Recommendation

Keep protocol and product packages separate. HA2HA skills and scripts should
target portable file, method, validation, evidence, and conflict behavior.
MDSync skills should target hosted routes, tokens, dashboards, comments,
history, provider sync, and team-pilot onboarding. Scripts must be small,
audited, explicit about environment variables, and stop after repeated
conflicts.

## Accepted Outcome

Accepted.

Codex/Claude-style skills remain the first integration path. Tool adapters for
Cloudflare Agents SDK, Vercel/eve, Vercel AI SDK, Mastra, and internal
harnesses are adapters over protocol methods. Provider-sync adapters should not
be marketed for engineering governance until the coordination, trust,
evidence/review, governance, engineering, methods, fixtures, validators, and
conformance checks exist.

## Implementation Impact

- `@ha2ha/protocol`, `@ha2ha/http`, `@ha2ha/client`, and `@ha2ha/skills` remain
  portable protocol packages.
- `@mdsync/client` and `@mdsync/skills` remain hosted product packages.
- Harness playbooks document target contracts without implying every named tool
  adapter is shipped.
