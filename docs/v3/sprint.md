# v3 Sprint: Future HA2HA Collaboration Profiles

## Goal

Define future HA2HA profiles for broad human-agent collaboration: transport,
validation, methods, coordination, trust/delegation, evidence/review,
governance/audit/proof-of-work, engineering references, heterogeneous agent
integration, conformance, and migration from v1/v2.

## Current State

- v3 docs are future protocol direction, not current implementation scope.
- v1 remains the current protocol authority.
- No v3 implementation is required before v1 schemas, validators, examples, and conformance exist.
- v2 comments and identity remain product scope unless a v3 profile promotes portable semantics.
- v3 adapter and typed-tool names are target contracts, not shipped SDK claims.
  External package readiness is tracked in
  [../v1/tasks/V1-010-developer-package-adoption-readiness.md](../v1/tasks/V1-010-developer-package-adoption-readiness.md).
- Installable skill packages are not yet shipped. HA2HA protocol skills are
  tracked in
  [../v1/tasks/V1-011-ha2ha-installable-skill-package.md](../v1/tasks/V1-011-ha2ha-installable-skill-package.md);
  MDSync product skills are tracked in
  [../v2/tasks/V2-009-mdsync-installable-skill-package.md](../v2/tasks/V2-009-mdsync-installable-skill-package.md).

## Execution Order

1. Convert open questions into decision records.
2. Define transport, validation, provisioning, method, and failure-class
   contracts.
3. Define the coordination profile.
4. Define the trust and delegation profile.
5. Define the evidence and review profile.
6. Define governance, audit, and proof-of-work semantics.
7. Define the engineering profile.
8. Define heterogeneous agent integration playbooks.
9. Add profile conformance and migration guidance.
10. Run an engineering-team collaboration pilot over the validated profiles.

## Tasks

- [V3-001 Open Decisions To Decision Records](tasks/V3-001-open-decisions-to-decision-records.md)
- [V3-002 Coordination Profile](tasks/V3-002-coordination-profile.md)
- [V3-003 Trust And Delegation Profile](tasks/V3-003-trust-and-delegation-profile.md)
- [V3-004 Evidence Review Profile](tasks/V3-004-evidence-review-profile.md)
- [V3-005 Engineering Profile](tasks/V3-005-engineering-profile.md)
- [V3-006 Profile Conformance And Migration](tasks/V3-006-profile-conformance-and-migration.md)
- [V3-007 Engineering Team Collaboration Pilot](tasks/V3-007-engineering-team-collaboration-pilot.md)
- [V3-008 Transport Validation Method Contracts](tasks/V3-008-transport-validation-method-contracts.md)
- [V3-009 Agent Harness Integration Playbooks](tasks/V3-009-agent-harness-integration-playbooks.md)
- [V3-010 Governance Audit And Proof Of Work](tasks/V3-010-governance-audit-proof-of-work.md)

## Done Definition

- v3 decisions are captured before schema work starts.
- Cross-profile transport, validation, method, provisioning, and failure-class
  contracts are defined before individual profiles depend on them.
- Heterogeneous agent integration playbooks preserve the boundary between
  harness execution, MDSync product behavior, and HA2HA portable state.
- Heterogeneous-agent docs distinguish future adapter contracts from installable
  packages, SDKs, MCP tools, or skill distributions.
- Heterogeneous-agent docs distinguish portable HA2HA skills from hosted MDSync
  product skills.
- Governance, audit, and proof-of-work semantics distinguish portable protocol
  records from product admin logs, provider traces, and legal compliance
  claims.
- Each profile has vocabulary, file conventions, schema direction, examples, and conformance expectations.
- Profiles remain optional and independently conformable.
- v3 does not weaken v1 core workspace semantics.
- Migration notes explain what moves from v2 product scope into protocol scope, if anything.
- The engineering-team pilot proves that at least two independent agent
  contexts and one human reviewer can coordinate through a shared workspace
  without relying on private chat history.

## Verification Commands

```bash
rg -n "Open Decisions|transport|validation|methods|coordination|trust|evidence|governance|audit|proof|engineering|agent|conformance" docs/v3
pnpm run check
```
