## Summary

Describe what changed and why.

## Security / compatibility impact

Check every item that applies:

- [ ] No crypto or key-envelope behavior changed
- [ ] No persisted vault/schema format changed
- [ ] No backup/import/restore behavior changed
- [ ] No renderer/main-process privilege boundary changed
- [ ] No release/publishing permission changed
- [ ] No runtime network dependency added
- [ ] No real secrets or customer data included

If any box above cannot be checked, explain the change and its dedicated tests below.

## Testing

- [ ] `npm run test:regression`
- [ ] `npm run test:electron-crypto`
- [ ] `npm run test:gui-smoke`
- [ ] Applicable package build tested

Additional tests / notes:

## Release impact

Does this change artifact names, dependencies, signing, checksums, SBOM, provenance, or official publishing behavior? If yes, describe the trust impact and reference `RELEASE-2.5.md`.
