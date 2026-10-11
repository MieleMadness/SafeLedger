# SafeLedger 2.6.116 — Phase 1: Trusted Authentication and Lockout Authority

This is Phase 1 of the [three-phase security/maintenance plan](SECURITY-CLEANUP-3-PHASES.md).
It carries forward all 2.6.115 Profile brand icons and previous UI updates.

## Why this change was required

Previously `crypto-v3-login` returned `password-failed` to the renderer,
then the renderer separately invoked `record-password-failure`. Password
verification therefore could run without counting a failed attempt if the
caller omitted, interrupted, or raced the second request. That was an
architectural bypass of account lockouts and optional Self-Destruct protection.

`crypto-v3-change-password` also offered a password-verification path while
the vault was locked, bypassing normal login failure accounting.

## The durable replacement

- One trusted main-process login coordinator owns the login decision.
- Concurrent attempts are serialized, with stored lockout policy checked
  before the expensive Argon2id verifier is called.
- Wrong passwords are counted/persisted before the renderer receives a retry
  decision. Failure to load or save security state fails closed and destroys
  any active data-key session.
- Removed the standalone renderer-facing `record-password-failure` IPC.
- Locked sessions can no longer invoke Change Password as an alternative
  password-checking method.
- Renderer still refocuses the password input when further attempts are
  allowed and keeps login disabled during enforced lockout or uncertain
  security state.
- The existing authoritative key envelope, encrypted vault format, and
  configured lockout and Self-Destruct settings are preserved.

## Tests and compatibility

A new canonical main-process login regression suite covers wrong/correct
passwords, concurrent requests, lockout timing, exhausted protection,
persistence failure, and direct-IPC bypass guards. Existing lockout tests now
assert the renderer no longer owns failure accounting.

No changes to AES-GCM, Argon2id, active DEK lifecycle, portable data root,
encrypted file schema, backups, legacy import compatibility, or recovery
operations are intended.

Before merging, confirm Windows Portable, Linux AppImage, and macOS Apple
Silicon regression/packaging workflows all succeed on the exact final commit,
then manually test wrong-password retries, lockout expiry, and the configured
Self-Destruct behavior using **disposable test data only**.
