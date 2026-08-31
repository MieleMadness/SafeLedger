# Third-Party Software Notices

SafeLedger uses third-party open-source packages. Their own license and copyright terms remain in force.

The committed `package.json` and `package-lock.json` are the source of truth for the dependency graph. The official SafeLedger 2.5 release workflow also produces a CycloneDX SBOM from the locked dependency installation used for the tagged build.

## Direct runtime dependencies

The current direct runtime dependency set includes:

- `hash-wasm`
- `qrcode`

The complete transitive dependency set may be larger and can change only through reviewed dependency updates reflected in the committed lock file.

## Build/development dependencies

Build tooling such as Electron, electron-builder, esbuild, marked, and token/icon tooling is used to build or test SafeLedger but is not evidence that every development package becomes part of the runtime application.

## Attribution handling

When a third-party package requires preservation of a license, copyright, or notice in redistributed binary form, that requirement must be honored in the official distribution. The release SBOM is an inventory aid and does not replace individual package license obligations.

Before an official 2.5 tag is published, maintainers should review the licenses represented by the locked production dependency graph and resolve any incompatible or unmet redistribution obligations.
