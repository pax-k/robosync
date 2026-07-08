# v3 Sprint: Future HA2HA Collaboration Profiles

## Goal

Define future HA2HA profiles for broad human-agent collaboration: transport,
validation, methods, coordination, trust/delegation, evidence/review,
engineering references, conformance, and migration from v1/v2.

## Current State

- v3 docs are future protocol direction, not current implementation scope.
- v1 remains the current protocol authority.
- No v3 implementation is required before v1 schemas, validators, examples, and conformance exist.
- v2 comments and identity remain product scope unless a v3 profile promotes portable semantics.

## Execution Order

1. Convert open questions into decision records.
2. Define transport, validation, provisioning, method, and failure-class
   contracts.
3. Define the coordination profile.
4. Define the trust and delegation profile.
5. Define the evidence and review profile.
6. Define the engineering profile.
7. Add profile conformance and migration guidance.
8. Run an engineering-team collaboration pilot over the validated profiles.

## Tasks

- [V3-001 Open Decisions To Decision Records](tasks/V3-001-open-decisions-to-decision-records.md)
- [V3-002 Coordination Profile](tasks/V3-002-coordination-profile.md)
- [V3-003 Trust And Delegation Profile](tasks/V3-003-trust-and-delegation-profile.md)
- [V3-004 Evidence Review Profile](tasks/V3-004-evidence-review-profile.md)
- [V3-005 Engineering Profile](tasks/V3-005-engineering-profile.md)
- [V3-006 Profile Conformance And Migration](tasks/V3-006-profile-conformance-and-migration.md)
- [V3-007 Engineering Team Collaboration Pilot](tasks/V3-007-engineering-team-collaboration-pilot.md)
- [V3-008 Transport Validation Method Contracts](tasks/V3-008-transport-validation-method-contracts.md)

## Done Definition

- v3 decisions are captured before schema work starts.
- Cross-profile transport, validation, method, provisioning, and failure-class
  contracts are defined before individual profiles depend on them.
- Each profile has vocabulary, file conventions, schema direction, examples, and conformance expectations.
- Profiles remain optional and independently conformable.
- v3 does not weaken v1 core workspace semantics.
- Migration notes explain what moves from v2 product scope into protocol scope, if anything.
- The engineering-team pilot proves that at least two independent agent
  contexts and one human reviewer can coordinate through a shared workspace
  without relying on private chat history.

## Verification Commands

```bash
rg -n "Open Decisions|transport|validation|methods|coordination|trust|evidence|engineering|conformance" docs/v3
pnpm run check
```
