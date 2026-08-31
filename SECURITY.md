# SafeLedger Security Policy

SafeLedger is a local-first encrypted information vault. Security reports are welcome and should avoid exposing real user secrets or exploit details publicly before maintainers have had a reasonable opportunity to investigate.

## Supported versions

The current stable 2.x release line receives security fixes. Older releases may be evaluated when a report affects migration, restore, or compatibility behavior, but users should normally move to the latest stable release.

## Reporting a vulnerability

Prefer GitHub's private security-reporting / Security Advisory flow for this repository when it is available. Do not open a public issue containing a working exploit, production signing material, private customer data, or real seed phrases/private keys/passwords/PINs.

A useful report includes:

- affected version and platform;
- the security boundary that appears to fail;
- minimal synthetic reproduction steps;
- expected versus observed behavior;
- whether the issue requires an unlocked vault, local filesystem access, a malicious file, or another prerequisite;
- suggested mitigation, if known.

## Sensitive data

Never include real recovery material in a report. Synthetic test secrets are sufficient for reproductions.

## Release and supply-chain reports

Reports about official release provenance, checksums, GitHub Actions permissions, signing, artifact substitution, SBOM accuracy, or tag/version validation are security reports and should follow the same private-reporting guidance when exploitable.

## Scope notes

SafeLedger does not claim to protect a device that is already fully compromised while the vault is unlocked. Reports about bypassing encryption, leaking secrets across the renderer/main-process boundary, unsafe restore/import behavior, unauthorized release publication, or secrets entering logs/search/history are particularly relevant.
