# @mdsync/skills

Installable MDSync hosted product agent skill package.

## Install

Install this package from a tarball or registry, then copy or register
`skills/mdsync` with the agent surface that supports Codex-style skills.

The skill assumes `@mdsync/client` is available for hosted product routes and
`@ha2ha/client` or `@ha2ha/skills` are available for portable HA2HA file, task,
and evidence workflows.

## Included Skill

- `skills/mdsync`: join or publish hosted MDSync workspaces, inspect product
  route state, update files with `baseVersion`, create comments, inspect
  history/admin/capability state, link dashboards, and write evidence without
  exposing secrets.

## Maturity

This is the first installable MDSync product skill package. It is separate from
the protocol-only `@ha2ha/skills` package.
