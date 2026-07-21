# @ha2ha/skills

Installable HA2HA protocol-only agent skill package.

## Install

Install directly from the public skills repository:

```bash
npx skills add pax-k/ha2ha-mdsync --skill ha2ha
```

Published listing: `https://skills.sh/pax-k/ha2ha-mdsync/ha2ha`.

Public protocol documentation: `https://ha2ha.md`.
Source: `https://github.com/pax-k/ha2ha-mdsync`.

Alternatively, install this package from a tarball or registry, then copy or
register the exported `@ha2ha/skills/skills/ha2ha` payload with the agent
surface that supports Codex-style skills. The package stages that payload from
the canonical repository-level `skills/ha2ha` source during packing.

The skill uses `ha2ha-validate` when an installed source or package build makes
the CLI available. Registry publication remains pending, so the public skill
workflow must not assume the CLI exists. It does not require MDSync dashboards,
comments, stats, admin routes, hosted auth, or provider sync.

MDSync is the hosted implementation at
`https://sync.ha2ha.md`; it does not change the portable skill
contract.

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
