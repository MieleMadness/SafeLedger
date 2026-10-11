# Verifying an Official SafeLedger Release

SafeLedger release artifacts are designed to let users verify file identity and build provenance without adding a cloud dependency to normal vault operation.

## Official release files

A current official cross-platform release is expected to include platform downloads such as:

- `SafeLedger-<version>-Portable.exe` — Windows x64 portable build
- `SafeLedger-<version>-x86_64.AppImage` — Linux x64 AppImage
- `SafeLedger-<version>-macOS-arm64.zip` — macOS Apple Silicon test/distribution ZIP

Release verification material is expected to include the applicable files produced by the release tooling, including:

- `safeledger-<version>.cdx.json`
- `release-manifest.json`
- `SHA256SUMS.txt`
- signing/status documentation when applicable
- GitHub artifact attestations for supported workflow artifacts

Some release workflows may also publish supporting documentation such as `README.pdf`. The release page and tag must use the same version as the application package.

## Verify SHA-256 checksums

Use the exact filename from the release rather than copying a version-specific example.

### Windows PowerShell

```powershell
Get-FileHash .\SafeLedger-<version>-Portable.exe -Algorithm SHA256
```

Compare the resulting hash with the line for that filename in `SHA256SUMS.txt`.

### Linux

```bash
sha256sum SafeLedger-<version>-x86_64.AppImage
```

Compare the result with `SHA256SUMS.txt`.

### macOS

```bash
shasum -a 256 SafeLedger-<version>-macOS-arm64.zip
```

Compare the result with `SHA256SUMS.txt` when that artifact is part of the published release set.

A matching checksum establishes that your file is byte-for-byte identical to the file represented by the release checksum. It does not by itself prove who produced the file.

## Release manifest

`release-manifest.json` records release identity and verification information such as:

- SafeLedger version;
- release tag;
- tagged source commit;
- expected artifact filenames;
- SHA-256 hashes and byte sizes;
- platform signing state where applicable.

The manifest is itself covered by the release checksum/trust process.

## SBOM

`safeledger-<version>.cdx.json` is a CycloneDX Software Bill of Materials generated from the locked dependency graph used by the release workflow. It is intended for dependency review and security tooling.

An SBOM is an inventory, not a guarantee that every dependency is vulnerability-free.

## GitHub artifact attestations

SafeLedger's supported Windows, Linux, and macOS build workflows generate GitHub artifact attestations after the final verified build stage and before their clean download/verification artifacts are uploaded.

When GitHub attestation verification is available for the release, use GitHub's supported CLI/web verification flow to confirm that the artifact is associated with the expected SafeLedger repository, workflow, source commit, and platform build.

Provenance establishes a build/source relationship. It does not replace code review or prove that the software contains no defects.

## Platform signing status

### Windows

Windows release verification material records whether the portable binary is unsigned or Authenticode-signed when signing is configured. A checksum or provenance attestation is not equivalent to a Windows code signature.

Do not disable Windows security features simply to bypass a warning. Verify the release source, checksum, provenance, and signing status first.

### macOS

The current Apple Silicon workflow verifies that the packaged SafeLedger executable is arm64. Unless release notes explicitly state otherwise, do not assume the ZIP is Developer ID signed or Apple-notarized. Architecture verification, checksums, and GitHub provenance do not substitute for Apple signing/notarization.

## Portable data reminder

SafeLedger stores working data in `SafeLedgerData` beside the packaged application. Back up and verify your SafeLedger data before replacing an older application binary. Do not overwrite or discard `SafeLedgerData` during an application upgrade.

## Report inconsistencies

If an official release is missing expected files, has mismatched checksums, reports an unexpected source commit, has a platform/architecture mismatch, or presents unclear signing/provenance status, do not treat the release as verified. Report the discrepancy according to `SECURITY.md` when it could represent a supply-chain security problem.
