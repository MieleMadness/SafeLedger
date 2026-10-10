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

## Packaged Profile service brand SVGs (SafeLedger 2.6.115)

SafeLedger bundles reviewed brand artwork as static local SVG files in
`src/main/assets/service-icons/`. These files are included in desktop packages
and loaded offline as ordinary images, without adding an icon runtime or CDN.
See the packaged `docs/service-icon-sources.md` for the precise
source file of every logo.

- **SVG Logos** (Gil Barbara), CC0:
  https://github.com/gilbarbara/logos/blob/main/LICENSE.txt
- **Simple Icons** (eBay and Proton), CC0 1.0:
  https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md
- **vscode-icons** (Outlook), MIT; copyright (c) 2016 Roberto Huertas.
  The full MIT license text is reproduced below in these packaged notices.
- **Font Awesome Free Brands** (Amazon), Font Awesome Free 7.3.1
  by @fontawesome, SVG icons under Creative Commons Attribution 4.0:
  https://fontawesome.com/license/free and
  https://creativecommons.org/licenses/by/4.0/

The drawing licenses do not convey permission to use any company's name,
logo, or trademark beyond applicable rights. Third-party brands remain the
property of their respective owners, and inclusion indicates identification
only, not endorsement or an official affiliation.

### MIT license for vscode-icons Outlook artwork

```text
The MIT License (MIT)

Copyright (c) 2016 Roberto Huertas

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
