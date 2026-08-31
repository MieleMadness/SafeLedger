# Contributing to SafeLedger

Thank you for helping improve SafeLedger. Because SafeLedger stores sensitive recovery information, changes should favor compatibility, explicit security boundaries, and testability over cleverness.

## Development baseline

- Node.js 24 is the current CI baseline.
- Electron and all dependencies must come from the committed `package-lock.json`.
- Install with `npm ci --no-audit --no-fund`.
- Do not replace locked dependencies or introduce runtime network dependencies without an explicit review.

## Before opening a pull request

Run:

```bash
npm run test:regression
npm run test:electron-crypto
npm run test:gui-smoke
```

When practical for your platform, also run the applicable package build:

```bash
npm run dist:win
npm run dist:linux
```

## Security and compatibility invariants

Unless a change is explicitly scoped as a reviewed migration, preserve these invariants:

- AES-256-GCM vault encryption remains authenticated.
- Argon2id protects the master-password key envelope.
- The unwrapped Data Encryption Key remains main-process only.
- Existing SafeLedger 2.x vaults continue to open without destructive conversion.
- SafeLedger 1.x import remains read-only.
- Backup v3 generation and backup v2/v3 restore compatibility remain intact.
- `SafeLedgerData` remains portable beside packaged SafeLedger builds.
- Emergency Lock and device/session locks clear the encryption session before UI reset work.
- Device/OS security events never count as password failures and never trigger Self-Destruct.
- Recovery Intelligence, Global Search, Activity History, and release tooling must not expose seed phrases, private keys, passwords, PINs, or raw sensitive duplicate fingerprints.
- Normal vault operation remains local-first and offline.

Changes to cryptography, persisted schemas, backup formats, migration behavior, signing behavior, or release trust boundaries require dedicated regression coverage and documentation.

## Test data rules

Never commit or paste real:

- seed phrases;
- private keys;
- master passwords;
- PINs;
- customer vault files;
- production signing certificates or certificate passwords;
- recovery locations or other private customer data.

Use synthetic fixtures created only for testing.

## Pull requests

Keep pull requests focused. Explain:

1. what changed;
2. why it is needed;
3. security or compatibility impact;
4. tests added or updated;
5. whether persisted data, backup behavior, packaging, permissions, or dependencies changed.

A PR that changes security-sensitive behavior without tests may be held until the risk can be evaluated.

## Release infrastructure

Pull-request workflows are untrusted validation contexts. They must not receive production signing credentials or permissions capable of publishing an official release.

Official release changes must preserve the fail-closed rules in `RELEASE-2.5.md` and the release-policy regression suite.
