# Verifying an Official SafeLedger Release

SafeLedger 2.5 introduces release artifacts that let users verify file identity and build provenance without adding a cloud dependency to normal vault operation.

## Official release files

An official release is expected to include:

- `SafeLedger-<version>-Portable.exe`
- `SafeLedger-<version>-x86_64.AppImage`
- `README.pdf`
- `safeledger-<version>.cdx.json`
- `release-manifest.json`
- `SHA256SUMS.txt`
- `WINDOWS-SIGNING.txt`

The release page and tag must use the same version as the application package.

## Verify SHA-256 checksums

### Windows PowerShell

```powershell
Get-FileHash .\SafeLedger-2.5.0-Portable.exe -Algorithm SHA256
```

Compare the resulting hash with the line for that filename in `SHA256SUMS.txt`.

### Linux

```bash
sha256sum SafeLedger-2.5.0-x86_64.AppImage
```

Compare the result with `SHA256SUMS.txt`.

A matching checksum establishes that your file is byte-for-byte identical to the file represented by the release checksum. It does not by itself prove who produced the file.

## Release manifest

`release-manifest.json` records:

- SafeLedger version;
- release tag;
- tagged source commit;
- expected artifact filenames;
- SHA-256 hashes and byte sizes;
- Windows signing state.

The manifest is itself included in `SHA256SUMS.txt`.

## SBOM

`safeledger-<version>.cdx.json` is a CycloneDX Software Bill of Materials generated from the locked dependency graph used by the release workflow. It is intended for dependency review and security tooling.

An SBOM is an inventory, not a guarantee that every dependency is vulnerability-free.

## GitHub artifact attestations

Official Windows and Linux binaries are designed to receive GitHub artifact attestations after their final verified build stage and before release publication.

When GitHub attestation verification is available for the release, use GitHub's supported CLI/web verification flow to confirm that the artifact is associated with the expected SafeLedger repository, workflow, and source commit.

Provenance establishes a build/source relationship. It does not replace code review or prove that the software contains no defects.

## Windows signing

`WINDOWS-SIGNING.txt` records whether the release pipeline produced the Windows binary as:

- `unsigned`, or
- `authenticode-signed`.

When signing is configured, the release workflow verifies the Authenticode signature before checksums are generated. When no trusted certificate is configured, the release must state that the binary is unsigned rather than implying that checksum or provenance verification is equivalent to a Windows code signature.

Do not disable Windows security features simply to bypass a warning. Verify the release source, checksum, provenance, and signing status first.

## Portable data reminder

SafeLedger stores working data in `SafeLedgerData` beside the packaged application. Back up and verify your SafeLedger data before replacing an older application binary. Do not overwrite or discard `SafeLedgerData` during an application upgrade.

## Report inconsistencies

If an official release is missing expected files, has mismatched checksums, reports an unexpected source commit, or presents unclear signing/provenance status, do not treat the release as verified. Report the discrepancy according to `SECURITY.md` when it could represent a supply-chain security problem.
