# Security And Identity

## Capability Link Maturity

After v0, MDSync should add product UX for:

- token rotation
- token revocation
- showing active capabilities
- regenerating read/edit links
- auditing recent token use when available

These features improve product safety without making identity mandatory for HA2HA.

V2 implements capability status, rotation, and revocation as MDSync product
routes:

- `GET /api/workspaces/:workspaceId/capabilities` shows read/edit capability
  status without returning raw token values.
- `POST /api/workspaces/:workspaceId/capabilities/read/rotate` creates a new
  read token, stores only its hash, and invalidates the previous read token.
- `POST /api/workspaces/:workspaceId/capabilities/edit/rotate` creates a new
  edit token, stores only its hash, and invalidates the previous edit token.
- `POST /api/workspaces/:workspaceId/capabilities/read/revoke` clears the
  read-token hash while preserving edit-token reads for operators.
- `POST /api/workspaces/:workspaceId/capabilities/edit/revoke` sets
  `write_access` to `none` and clears the edit-token hash.

Rotation responses return one-time capability URLs so the browser can continue
after an edit-token rotation. Task evidence, admin status payloads, and
capability status payloads must not include raw token values.

## Users And Sessions

User and session UX should be introduced when capability links are insufficient for product needs such as:

- workspace ownership
- private dashboards
- team administration
- comment authorship
- billing
- audit trails

Identity is product scope unless a future HA2HA version explicitly standardizes identity semantics.

V2-005 does not add users or sessions. Capability links still satisfy the
current product needs for workspace access, comments, stats, and admin controls.
Users and sessions remain deferred for ownership, billing, team administration,
private dashboards, and durable audit identity.

## Encryption

Encryption is not a casual toggle. The key-ownership model changes product capabilities.

V2 chooses server-managed encryption as the first implementation path. See
[encryption-ux-decision.md](encryption-ux-decision.md).

Server-managed encryption preserves:

- browser preview
- raw plaintext routes
- search
- comments
- server-side indexing

Client-side or end-to-end encryption changes those capabilities because MDSync cannot inspect plaintext without the key.

No encryption mechanics ship in V2-006. Implementation must be split into later
tasks covering key hierarchy, tests, migration/backfill, secret handling,
import/export behavior, and any future end-to-end encrypted workspace mode.

## Retention

Retention policies should cover:

- workspace deletion
- old file versions
- event retention
- comments
- orphaned R2 objects
- admin logs

Retention is product policy. HA2HA conformance should not require a specific retention schedule.

V2 implements manual retention visibility and pruning as write-capability-gated
product routes. Export bundles include workspace contents and product review
state, so export is also write-capability gated. Exports and task evidence must
not include raw capability tokens or token hashes; import always creates fresh
capability material for the new workspace.
