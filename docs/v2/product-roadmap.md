# MDSync Product Roadmap

v2 is the product layer after v0 ships and v1 protocol conformance is underway.

## Order

1. Changelog and activity UI over protocol events.
2. File-history UI over protocol file versions.
3. Diff and restore workflows.
4. Lightweight workspace stats.
5. Comments anchored to workspace path and version.
6. Admin surfaces for workspace health, retention, and cleanup.
7. Token rotation and revocation UX.
8. User/session UX where capability links are insufficient.
9. Import/export workflows.
10. Encryption UX after the key-ownership model is decided.
11. Per-workspace D1 when isolation or scale evidence justifies it.
12. MDSync client SDK for hosted product integration.
13. First-party MDSync product skill package built on the client SDK.

## Principle

Product features should use HA2HA protocol primitives where they exist. They should not redefine protocol behavior inside MDSync.

For example, event/history UI is v2 product scope over v1 `workspace_events` and `workspace_file_versions`.
