# @ha2ha/skills

Installable HA2HA protocol-only agent skill package.

## Install

Install directly from the public skills repository:

```bash
npx skills add pax-k/robosync --skill ha2ha
```

Published listing: `https://skills.sh/pax-k/robosync/ha2ha`.

Alternatively, install this package from a tarball or registry, then copy or
register `skills/ha2ha` with the agent surface that supports Codex-style
skills.

The skill assumes the `ha2ha-validate` CLI from `@ha2ha/protocol` is available
when validating workspaces. It does not require MDSync dashboards, comments,
stats, admin routes, hosted auth, or provider sync.

Public protocol documentation is served from
`https://mdsync-ha2ha-pax.pax.workers.dev`.

## Included Skill

- `skills/ha2ha`: publish or join HA2HA workspaces, read context, validate,
  update files with `baseVersion`, claim tasks, add evidence, record decisions,
  write handoffs, and stop on repeated conflicts.

## Fixture

- `fixtures/minimal-workspace`: small local HA2HA workspace for dogfood and
  validation.

## Maturity

This is the first installable HA2HA skill package. It is protocol-only and
separate from future MDSync product skills.
