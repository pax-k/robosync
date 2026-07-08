# MDSync Client SDK

## Status

Planned, not shipped.

No `@mdsync/client` package exists yet. Current MDSync integration surfaces are
the hosted app/backend, product docs, repo-local scripts, HA2HA protocol
packages, HTTP conformance tooling, and alpha skill guidance.

## Purpose

`@mdsync/client` should make hosted MDSync easy to integrate as a product and
service.

It should let apps, skills, CLIs, internal tools, and provider adapters use
MDSync without hand-rolling hosted routes, token handling, dashboard links,
comments/history reads, stats/admin reads, or product-specific read models.

## Boundary

The MDSync client may wrap `@ha2ha/client` for portable HA2HA workspace
operations.

It may also expose MDSync product behavior, but those methods must stay labeled
as MDSync scope. Product convenience must not redefine HA2HA protocol
semantics.

## Extra Capabilities Over HA2HA

`@mdsync/client` can provide hosted product helpers for:

- creating and publishing hosted workspaces
- managing read and edit tokens or identity sessions
- generating dashboard, edit, and raw links
- reading comments and comment resolution state
- reading activity, history, stats, and admin product state
- supporting import, export, retention, and team-pilot flows
- wrapping MDSync product routes for installable MDSync skills
- integrating future provider-sync adapters

These capabilities are useful because they reduce product integration friction,
but they are not HA2HA protocol authority.

## Relationship To HA2HA Client

Use `@ha2ha/client` when the goal is portable protocol adoption.

Use `@mdsync/client` when the goal is hosted MDSync product adoption.

Dependency direction should stay one-way:

```txt
@mdsync/client -> @ha2ha/client -> @ha2ha/protocol
```

The HA2HA client must not import or depend on the MDSync client.

## Not Shipped Until Proven

Do not market `@mdsync/client` as shipped until:

- the package exists with release metadata and install docs
- token or identity handling is documented and tested
- product-only routes are separated from HA2HA protocol methods
- installable MDSync skills can use the client without repo-local scripts
- local or deployed MDSync dogfood evidence exists

Track implementation readiness in
[tasks/V2-010-mdsync-client-sdk.md](tasks/V2-010-mdsync-client-sdk.md).
