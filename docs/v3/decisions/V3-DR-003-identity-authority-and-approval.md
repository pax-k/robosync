# V3-DR-003 Identity Authority And Approval

## Owner

HA2HA protocol maintainer.

## Scope

Principal shape, participant identity, human-agent pairs, authority grants,
delegation, revocation history, and approval authority.

## Open Questions Covered

- How much identity HA2HA can standardize without forcing a provider.
- Minimum portable principal and authority grant shape.
- How human-agent pairs are represented.
- Whether approvals require human principals.
- Whether agents can approve within delegated authority.
- How revoked grants are represented historically.

## Options

- Require one identity provider.
- Use opaque actor handles only.
- Define portable principals, human-agent pairs, roles, authority grants, and
  delegation while leaving verification to implementations.
- Allow unrestricted agent approvals.

## Recommendation

Define portable identity and authority records without choosing an auth
provider. Require every approval to identify a principal and authority basis.
Agents may record approval-like decisions only when explicitly granted
`approve`; human approvals are required for governance-sensitive gates unless a
workspace policy explicitly delegates approval.

## Accepted Outcome

Accepted.

v3 trust records distinguish principals, participants, human-agent pairs,
roles, authority grants, and delegation. Historical revocation is represented by
new grant records or `revokedAt`, not by deleting old authority records.

## Implementation Impact

- Participant frontmatter can declare `kind`, `roles`, `authority`,
  `delegated_by`, and `delegation_scope`.
- Authority grants are portable records in `.ha2ha/v3/authority-grants.json`.
- Raw tokens, private credentials, and secrets are rejected from portable
  records.
