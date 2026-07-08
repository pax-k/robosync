# Encryption UX Decision

## Decision

MDSync v2 should implement server-managed encryption first.

The first encryption implementation should use server-owned key management for
workspace content and product data. MDSync remains able to read plaintext inside
trusted server execution so existing product workflows continue to work.

Client-side or end-to-end encryption is deferred until the product explicitly
needs a mode where MDSync cannot inspect workspace plaintext.

## Key Ownership

Initial model:

- MDSync owns encryption operations.
- Workspace data is decrypted only inside trusted server execution.
- Operators and future owner/admin users manage access through product
  permissions, not by handling raw encryption keys.
- Key material must not be exposed through workspace files, product routes,
  browser UI, logs, task evidence, exports, or screenshots.

Future model to evaluate:

- per-workspace envelope keys
- owner-managed key wrapping
- bring-your-own-key for enterprise workspaces
- end-to-end encrypted workspaces where only clients hold plaintext keys

## UX Impact

Server-managed encryption preserves current product behavior:

- browser preview works
- raw plaintext routes continue to serve authorized clients
- search and server-side indexing can inspect workspace text
- comments can anchor to paths, versions, lines, and headings
- admin stats can aggregate files, versions, events, comments, and task state
- import/export can include plaintext for authorized operators
- HA2HA v1 conformance remains about workspace records and routes, not the
  storage encryption mechanism

Client-side or end-to-end encryption would change product behavior:

- browser preview needs client key unlock before rendering
- raw routes cannot return plaintext unless the server receives a key or serves
  ciphertext
- search and indexing become unavailable or client-side only
- comments cannot safely anchor to headings or plaintext-derived selectors
  unless the client computes anchors
- server-side admin stats lose task-state and content-derived health checks
- import/export must preserve encrypted bundles and key metadata separately

## Threat Assumptions

Server-managed encryption is meant to reduce exposure from storage-layer data
access and accidental object/database disclosure. It does not protect against a
compromised MDSync server runtime, malicious server operator, or product route
that is authorized to decrypt data.

End-to-end encryption is the right model only if MDSync must be unable to read
workspace plaintext. That is a separate product mode with different preview,
search, comments, raw route, admin, and support tradeoffs.

## Follow-Up Implementation Split

Implementation tasks should be opened after this decision, not as part of
V2-006:

1. Add a server-managed encryption architecture spec covering key hierarchy,
   rotation, migration, local development, and Cloudflare deployment boundaries.
2. Add encrypted object write/read tests proving file content round-trips
   through current raw/API routes without changing HA2HA protocol records.
3. Add migration and backfill planning for existing R2 objects and D1 product
   rows, including rollback and partial-failure recovery.
4. Add secret-handling tests proving keys and decrypted content are not logged,
   stored in task evidence, or returned by admin status payloads.
5. Add import/export tests for encrypted-at-rest workspaces and document when
   exports are plaintext versus encrypted bundles.
6. Add a future product discovery task for end-to-end encrypted workspace mode
   before implementing client-side encryption mechanics.

## Non-Goals For V2-006

- no encryption code
- no key generation
- no schema migration for key metadata
- no object re-encryption
- no changes to HA2HA v1 protocol semantics
