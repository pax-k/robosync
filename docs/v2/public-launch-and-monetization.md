# Public Launch And Monetization

This note defines the recommended public launch and monetization shape for
Robosync/MDSync after the v3 HA2HA collaboration profiles exist.

The key split is:

- HA2HA is the open protocol layer.
- Robosync/MDSync is the hosted product and governance layer.

The protocol should earn adoption by being easy to inspect, validate, and
implement. The SaaS should monetize the parts engineering teams need when
human-agent work becomes operational: identity, coordination enforcement,
evidence, review, engineering integrations, retention, audit, and admin
controls.

## Product Position

HA2HA should remain free and open:

- specifications
- schemas
- examples
- validators
- conformance CLI
- canonical workspace conventions
- core HTTP profile expectations

Robosync/MDSync should charge for hosted reliability and team governance:

- private hosted workspaces
- durable history and event retention
- comments, reviews, approvals, and evidence UX
- org identity, roles, delegation, and audit trails
- coordination gates such as claims, leases, handoffs, and blockers
- engineering adapters for repositories, issues, pull requests, checks, and
  deployments
- admin, security, compliance, retention, and support

Do not charge for the protocol primitives themselves. Charging for protocol
adoption too early weakens the ecosystem. Charge for hosted enforcement,
visibility, retention, and team workflow value.

## Tier Strategy

| Tier | Audience | Included Value | Commercial Boundary |
| --- | --- | --- | --- |
| Open Protocol | Ecosystem, self-hosters, tool builders | HA2HA docs, schemas, validators, examples, fixtures, conformance suite | Free forever |
| Free Builder | Solo builders, demos, OSS, early adopters | Hosted workspaces, browser preview/editor, raw routes, API create/update, optimistic conflicts, public/token links, basic templates | Generous public usage, capped private usage, short retention |
| Pro | Solo professionals, consultants, power users | More private workspaces, file history, diff/restore, comments, token rotation/revocation, import/export, webhooks, longer retention | Monthly subscription with larger quotas |
| Engineering Team | Engineering teams coordinating real work through agents | Organizations, seats, RBAC, claims, leases, handoffs, approval gates, structured evidence, review records, required checks, GitHub/GitLab/Linear/Jira adapters, Slack notifications, dashboards | Per-seat subscription plus pooled usage |
| Enterprise | Security-sensitive and larger organizations | SSO/SAML/SCIM, domain controls, audit export, custom retention, compliance material, data residency or private deployment, SLA, priority support, custom conformance | Custom contract |

The strategic product is the Engineering Team tier. Pro is useful as a
self-serve bridge, but the highest willingness to pay starts when the workspace
becomes an accountable engineering coordination system.

## Free Tier

The free tier should be generous where it drives adoption:

- public readable workspaces
- raw agent-readable workspace routes
- basic browser preview and Markdown editor
- API workspace creation and file updates
- `baseVersion` conflict handling
- capability links for read/edit access
- basic HA2HA workspace templates
- core validator and conformance output

Recommended starting limits:

| Resource | Free Builder Starting Limit |
| --- | --- |
| Users | 1 user |
| Public workspaces | 100 active workspaces |
| Private/token workspaces | 5 to 10 active workspaces |
| Storage | 1 GB total |
| File size | 10 MB per file |
| Write operations | 1,000 to 5,000 per month |
| History/events | 30 days |
| Comments/reviews | Basic or disabled until Pro |
| Provider integrations | None or read-only demo connection |

Public raw reads should use fair-use limits and rate limiting rather than a
tight visible quota. The core product loop is sharing a workspace with humans
and agents; that loop should not feel metered before users understand the
value.

## Paid Feature Boundary

The first paid wall should appear when the user needs durable private work,
history, or team accountability.

### Pro

Pro should monetize individual professional value:

- higher private workspace quota
- longer file history and event retention
- diff and restore UI
- comments anchored to path and version
- token rotation and revocation UX
- import/export
- API keys and webhooks
- workspace stats

Initial pricing hypothesis: `15-20 USD/month`.

### Engineering Team

Engineering Team should monetize coordination and trust:

- organization workspaces
- member seats and roles
- service accounts and agent identities
- claims and leases
- handoffs
- dependencies, blockers, acceptance criteria, and approval gates
- structured evidence records
- review comments, questions, responses, and approval records
- required checks that block completion when missing, stale, or failing
- repository, branch, commit, issue, pull request, CI, deployment, and code
  review references
- GitHub/GitLab/Linear/Jira adapters
- Slack or equivalent notifications
- dashboards for task state, stale claims, failing checks, unresolved review,
  and missing evidence

Initial pricing hypothesis: `25-35 USD/user/month`, with pooled usage for
storage, events, evidence artifacts, writes, and provider sync.

### Enterprise

Enterprise should monetize procurement, security, compliance, and deployment
needs:

- SSO/SAML/SCIM
- domain claiming
- granular admin controls
- audit log export
- custom retention
- compliance questionnaires and security collateral
- private deployment or dedicated infrastructure when needed
- data residency commitments
- uptime SLA
- priority support and onboarding
- custom conformance reports

Pricing should be custom.

## v3 Profile Packaging

v3 profiles map cleanly to paid value, but the portable profile definitions
should remain open.

| v3 Profile | Open/Free Layer | Paid Product Layer |
| --- | --- | --- |
| Core workspace | Workspace convention, raw routes, version semantics, conflict semantics, validator | Hosted workspaces, storage, rate limits, support |
| Coordination | Public schema for tasks, claims, leases, handoffs, acceptance, questions, approvals | Enforcement UI, dashboards, stale-claim recovery, workflow automation |
| Trust | Public schema for principals, participants, roles, delegation, audit event shapes | Org identity, RBAC, service accounts, audit log retention, token controls |
| Evidence/review | Public schema for evidence, check results, review anchors, questions, responses, approvals | Review UI, blocking gates, approval workflows, evidence artifact retention |
| Engineering | Public schema for repos, branches, commits, issues, pull requests, checks, deployments | Provider OAuth, sync adapters, required-check freshness, CI/PR dashboards |

This keeps HA2HA portable while making Robosync/MDSync valuable as the hosted
system of record and enforcement layer.

## Launch Sequence

1. Publish the HA2HA protocol site and validator as the adoption surface.
2. Launch Free Builder with hosted workspaces, raw routes, editor/preview, and
   capability links.
3. Add Pro once file history, diff/restore, comments, revocation, and import or
   export are credible.
4. Add Engineering Team once v3 coordination, trust, evidence/review, and
   engineering profiles can be enforced in product flows.
5. Add Enterprise only after teams ask for SSO, audit retention, compliance
   material, custom retention, private deployment, or procurement support.

## Packaging Principles

- Keep protocol adoption unblocked.
- Charge when value depends on hosted state, retention, enforcement, identity,
  integrations, security, or support.
- Use quotas that map to actual cost drivers: workspaces, private storage,
  file history, events, evidence artifacts, writes, provider sync, and seats.
- Avoid charging separately for every small action in the core collaboration
  loop.
- Make usage limits explainable to engineering teams.
- Let public workspaces and open-source usage create distribution.
- Keep billing and product UI out of HA2HA protocol conformance.

## Open Decisions

- Whether Pro should exist long-term, or whether the product should simplify to
  Free Builder, Engineering Team, and Enterprise.
- Whether public workspaces should be unlimited under fair use or capped by
  active workspace count.
- Which provider adapter should be first for Engineering Team.
- Whether comments become a paid feature in Pro, or basic comments stay free
  with review enforcement paid.
- Whether conformance badges are free self-generated artifacts, paid hosted
  reports, or both.
- Whether self-hosted Robosync should be community-only, paid commercial, or
  enterprise-only.

