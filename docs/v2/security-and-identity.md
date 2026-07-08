# Security And Identity

## Capability Link Maturity

After v0, MDSync should add product UX for:

- token rotation
- token revocation
- showing active capabilities
- regenerating read/edit links
- auditing recent token use when available

These features improve product safety without making identity mandatory for HA2HA.

## Users And Sessions

User and session UX should be introduced when capability links are insufficient for product needs such as:

- workspace ownership
- private dashboards
- team administration
- comment authorship
- billing
- audit trails

Identity is product scope unless a future HA2HA version explicitly standardizes identity semantics.

## Encryption

Encryption is not a casual toggle. The key-ownership model changes product capabilities.

Server-managed encryption preserves:

- browser preview
- raw plaintext routes
- search
- comments
- server-side indexing

Client-side or end-to-end encryption changes those capabilities because MDSync cannot inspect plaintext without the key.

## Retention

Retention policies should cover:

- workspace deletion
- old file versions
- event retention
- comments
- orphaned R2 objects
- admin logs

Retention is product policy. HA2HA conformance should not require a specific retention schedule.
