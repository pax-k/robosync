# @mdsync/skills

Installable MDSync hosted product agent skill package.

## Install

Install directly from the public skills repository:

```bash
npx skills add pax-k/ha2ha-mdsync --skill mdsync
```

Published listing: `https://skills.sh/pax-k/ha2ha-mdsync/mdsync`.

Registry publication remains pending. Until it succeeds, use the public
skills.sh installation and its complete HTTP fallback. The SDK-backed runtime
becomes the preferred path when `@mdsync/skills/runtime` resolves from an
installed source build or future registry release.

The canonical skill directory can be registered directly from a public source
checkout at `skills/mdsync`. The npm package stages the exported
`@mdsync/skills/skills/mdsync` payload from that source during packing. The
included HTTP fallback does not require repo-local scripts.

New hosted workspaces default to discovery at
`https://sync.ha2ha.md/.well-known/mdsync.json`. Set
`MDSYNC_BASE_URL` only when intentionally targeting another conformant API.

Product documentation is served from
`https://sync.ha2ha.md/docs`. Source is available at
`https://github.com/pax-k/ha2ha-mdsync`.

The npm package installs `@mdsync/client`, `@ha2ha/client`, and `@ha2ha/skills`
as runtime dependencies. Skill installation grants no workspace access: users
still need a Viewer URL for inspection or a Collaborator URL for mutation.
Agent examples import the stable `@mdsync/skills/runtime` adapter. Consumers
only need to install `@ha2ha/protocol` separately when their own code imports it
directly.

## Included Skill

- `skills/mdsync`: join or publish hosted MDSync workspaces, inspect product
  route state, update files with `baseVersion`, create comments, inspect
  history/admin/capability state, link dashboards, and write evidence without
  exposing secrets.
- `skills/mdsync/references/url-handoff.md`: SDK and HTTP workflows for
  conformant publishing and pasted-URL coordination.
- `@mdsync/skills/runtime`: client creation, URL bootstrap and parsing, hosted
  HA2HA publishing, and strict MDSync manifest validation.

## Maturity

This is the first installable MDSync product skill package. It is separate from
the protocol-only `@ha2ha/skills` package. Direct public-source registration is
available now. npm installation becomes available after the coordinated
`0.1.0` packages pass the external scope-ownership publication gate.
