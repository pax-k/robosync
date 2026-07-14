# v2: Product Features Beyond Protocol

v2 is MDSync product scope beyond the HA2HA protocol. These features may use v1 protocol primitives, but they do not define protocol behavior.

## Product Boundary

HA2HA v1 defines shared workspace semantics, event/history protocol data, schemas, and conformance.

MDSync v2 turns those primitives into product experiences: a work-first routed
workspace, guided creation, dashboards, file-history UI, diff/restore UI,
comments, admin tools, identity, encryption UX, and storage evolution.

The workspace foundation leads with Focus, attention, tasks, comments, recent
activity, and grouped files. It preserves the v1 route and capability contract,
but does not freeze a particular UI composition for future team surfaces.

MDSync skills are product adoption artifacts. They may use HA2HA protocol
primitives, but hosted routes, tokens, dashboards, comments, history, provider
sync, and team-pilot onboarding remain MDSync product scope.

The URL handoff layer publishes a strict `/.well-known/mdsync.json` discovery
document, creates conformant HA2HA workspaces atomically for agent workflows,
and lets another installed skill join from only a Viewer or Collaborator URL.
Skill installation and workspace authorization remain separate operations.

## Files

- [sprint.md](sprint.md)
- [tasks/](tasks/)
- [client-sdk.md](client-sdk.md)
- [product-use-cases.md](product-use-cases.md)
- [high-impact-workflows.md](high-impact-workflows.md)
- [product-roadmap.md](product-roadmap.md)
- [product-features.md](product-features.md)
- [public-launch-and-monetization.md](public-launch-and-monetization.md)
- [product-data-model.md](product-data-model.md)
- [storage-evolution.md](storage-evolution.md)
- [security-and-identity.md](security-and-identity.md)
- [encryption-ux-decision.md](encryption-ux-decision.md)
- [team-workspace-pilot.md](team-workspace-pilot.md)
