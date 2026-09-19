# SafeLedger 2.6.76 — Supplied Chain Games Logo

SafeLedger 2.6.76 carries forward the complete 2.6.75 candidate and replaces SafeLedger's earlier Chain Games logo approximation with the artwork supplied by the project owner.

## Chain Games artwork

The uploaded Chain Games SVG contains a white circular Chain Games mark followed by the wider CHAIN GAMES wordmark. SafeLedger uses small square icon locations throughout the application, so this update uses the exact circular mark from the supplied SVG rather than shrinking the full horizontal wordmark into those spaces.

The supplied white mark is rendered on the existing dark Chain Games backing so it remains clearly visible in Light, Colorful, System, and Dark appearances.

The previous SafeLedger-created blue/purple gradient approximation has been retired.

## One canonical logo source

Chain Games already uses one local service-catalog artwork source. That source is shared by:

- the Chain Games Vault Item / Web3 service artwork;
- CHAIN assets identified as Chain Games assets.

Replacing the canonical artwork therefore updates both presentations together without adding duplicate icon logic.

The logo remains fully local and offline. SafeLedger does not fetch a website favicon, remote logo, or network resource to render it.

## Regression maintenance

The historical 2.6.4 regression explicitly required the previous gradient artwork. Because that visual requirement is intentionally obsolete, the historical test now verifies the supplied white circular mark instead while preserving the important behavior it was originally protecting:

- Chain Games uses dedicated vector artwork rather than initials;
- the artwork remains local/offline;
- Chain Games Vault Items and CHAIN assets share the same canonical source.

A new `hotfix-2.6.76-tests.js` gate verifies the supplied mark signature, white artwork, cross-theme backing, removal of the retired gradient approximation, shared Vault Item/Asset source, the repaired historical 2.6.4 regression, and the complete 2.6.75 candidate behavior.

## Security and data behavior

This is an artwork-only product change. It does not change encryption, vault data, recovery information, schema formats, network permissions, or storage behavior.

## Release safety

This is a cumulative candidate. **Do not merge to `master` until Windows, Linux, and macOS CI pass and the supplied Chain Games artwork is hands-on approved.**
