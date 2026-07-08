# Minimal HA2HA Workspace

Purpose: prove the v1 core workspace convention with one participant, one task,
one evidence file, and portable write examples.

Participant handles are stable workspace handles. Mutating writes use
`baseVersion` for existing files and include an `actor`.
