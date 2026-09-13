# SafeLedger 2.6.88 — Theme-Aware Square Chain Games Icon

SafeLedger 2.6.88 carries forward the complete 2.6.87 candidate and updates the Chain Games branding to the requested square icon treatment.

## What changed

Chain Games now uses only the **left icon** from the supplied Chain Games logo. The CHAIN GAMES wordmark is not included in the application icon.

The icon is a rounded square sized and rounded to match the other Vault Item and Asset artwork:

- **Light** uses a black background with the white Chain Games icon.
- **Colorful** uses the same black background with the white Chain Games icon.
- **Dark** uses a white background with the black Chain Games icon.

The former circular Chain Games treatment has been retired.

## Shared Vault Item and Asset branding

The Chain Games Vault Item and CHAIN Assets continue using one canonical artwork family. Both now render through the same theme-aware Chain Games tile, so the branding stays consistent between the Vault list, Asset list, and Asset detail view.

The larger Asset detail icon is also kept square with the same 7px corner treatment instead of inheriting the normal circular Asset-detail shape.

## Local/offline behavior

Both theme variants are self-contained SVG files packaged inside SafeLedger. They contain no scripts, embedded HTML, nested images, remote URLs, or network dependencies.

System appearance continues resolving through SafeLedger's existing theme system, so System automatically receives the correct Light or Dark Chain Games variant.

## What did not change

The 2.6.87 rollback of decorative Profile/Vault/Asset column wallpapers is unchanged. Those three navigation columns remain solid colors, while the sign-in Detail/display-column wallpaper remains intact.

No authentication, encryption, password, recovery, vault data, storage, network permission, or persistence behavior changed.

## Regression coverage

The historical Chain Games tests were updated to stop requiring the retired circular logo. A new 2.6.88 regression verifies the supplied left-only geometry, both black/white theme variants, rounded-square treatment, shared Vault Item/CHAIN Asset behavior, local/offline packaging, and continued execution of the 2.6.87 rollback gate.

Do not merge to `master` until Windows, Linux, and macOS CI pass and the new Chain Games icon is hands-on approved.
