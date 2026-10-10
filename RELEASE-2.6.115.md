# SafeLedger 2.6.115

## Real local service logos in Profile icon picker

Replaces the colored initials generated for all 27 built-in Services
(excluding the pre-existing themed Chain Games artwork) with reviewed,
recognizable, bundled SVG brand icons. The service set and canonical Profile
icon IDs are unchanged; existing selections display the new logos with no
migration.

- Primary source: SVG Logos (full-color graphics).
- Supplemental sources: Simple Icons (eBay and Proton), vscode-icons
  (Outlook), and Font Awesome Free Brands (Amazon).
- Logos are committed under `src/main/assets/service-icons/`, resolved
  through a small local manifest, and rendered as ordinary images. SafeLedger
  has **no new dependencies and no runtime network access for icons**.
- Existing fallback generated initial tiles are retained only for future
  service entries that do not yet have reviewed artwork.
- Each logo has a neutral white backing so dark marks remain visible in Light,
  Colorful and Dark themes.
- Existing Chain Games light/dark custom artwork remains unchanged.

## Licensing and provenance

Every asset has an upstream link and license in
`src/main/assets/service-icons/SOURCES.md`. Redistribution notices are in
`THIRD-PARTY-NOTICES.md`, with the full MIT license for the Outlook icon
packaged alongside the assets. Brand trademarks belong to the respective owners.

## Regression coverage

The canonical Profile icon suite verifies that every built-in Service maps to
a real, packaged SVG, file paths remain local, artwork lacks executable or
remote resource references, Chain Games retains its existing themed artwork,
and stored service IDs still normalize identically.

## Carried forward and security scope

Includes the 2.6.114 structural gap below Search icons, bordered Profile
icon frames, and the 2.6.113 incorrect-password retry fix.

No changes to Argon2id, AES-GCM encryption, the encrypted data format,
DEK lifetime, brute-force/lockout thresholds, Self-Destruct behavior,
renderer sandboxing, or persistence authority.
