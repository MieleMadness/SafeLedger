# SafeLedger 2.6.59 — Light + Colorful Appearance

SafeLedger 2.6.59 separates the existing bright-blue interface from the new Light appearance so users can choose between a softer workspace and the familiar SafeLedger color treatment.

## What changed

- **Colorful** is now the name of the former Light appearance. It keeps the familiar white content surfaces with bold SafeLedger blue navigation columns.
- **Light** is now a distinct appearance inspired by the provided SafeLedger design reference: white and pale-blue surfaces, navy text, soft blue borders, restrained shadows, and light navigation columns.
- **System** continues to follow the operating system. A light OS preference now resolves to the new Light appearance; a dark OS preference continues to resolve to Dark.
- **Dark** is unchanged.

## Compatibility

SafeLedger preserves the visual choice of existing users. A settings file created before 2.6.59 that explicitly stored `appearance: "light"` is treated as the legacy Light preference and migrates to **Colorful**. After that migration, selecting the new Light option saves normally and is not remapped again.

This is handled with a dedicated appearance schema marker rather than changing the overall SafeLedger settings format. That keeps the migration narrow and avoids altering unrelated security, recovery, or vault settings.

## Light design direction

The new Light palette follows the reference image rather than copying its marketing composition. The application itself keeps the existing SafeLedger layout and behavior while adopting:

- white / very pale-blue profile, vault, and asset columns;
- dark navy primary text for strong readability;
- light blue borders and selected-row fills;
- vivid blue accents for focus, actions, and active states;
- soft blue-tinted shadows instead of heavy contrast;
- white search fields and utility surfaces.

Wallet and asset icons keep their existing local colors, which gives the new Light theme color without requiring solid blue navigation rails.

## Implementation notes

Appearance palettes are centralized in `src/main/css/appearance-palettes.css`. The file is intentionally loaded as the final **color-only** layer so layout, spacing, feature behavior, and component ownership remain in the existing consolidated UI styles. It does not use timers, mutation observers, or post-render repair code.

The Settings screen now exposes four choices in this order: **System, Light, Colorful, Dark**.

## Regression coverage

2.6.59 updates the appearance regression suite and adds a release gate that verifies:

- all four appearance values normalize correctly;
- System still resolves to Light or Dark based on the OS preference;
- legacy Light settings migrate to Colorful exactly once;
- the new Light preference remains selectable after migration;
- Colorful retains the former blue-navigation palette;
- the Light palette uses pale navigation surfaces and dark readable text;
- the appearance palette remains the final intentional color layer;
- appearance changes continue through the existing narrow Settings save path.

## Release process

This remains a **candidate update** until CI builds and hands-on testing are complete. Do not merge it to `master` until the Windows, Linux, and macOS workflows pass and the new Light/Colorful behavior has been visually reviewed.
