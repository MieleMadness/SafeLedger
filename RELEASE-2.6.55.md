# SafeLedger 2.6.55

## Selected Asset edit targeting correction

SafeLedger 2.6.55 records the user-reported correction where editing an existing Asset such as Bitcoin could update the wrong authoritative record when starter Assets shared the same creation timestamp and the renderer displayed them in a different sorted order.

### What changed

- Asset edits capture the exact original selected Asset before changes begin.
- The renderer works on a submitted copy and does not reorder the live Asset collection before authoritative save resolution.
- The main-process data writer resolves modifications against the exact original encrypted Asset record.
- If that original Asset can no longer be uniquely matched, the write fails closed and asks the user to reload instead of falling back to a potentially wrong renderer index.
- Pin/unpin updates use the same exact-target path.

### Regression coverage

`hotfix-2.6.55-tests.js` recreates Bitcoin and Ethereum records that deliberately share a creation timestamp while the submitted renderer index points at the wrong sibling. The regression requires the Bitcoin edit to resolve Bitcoin by its original authoritative record and requires stale identity snapshots to fail closed.

### Why this is 2.6.55

This correction was identified by the user during hands-on testing. Per SafeLedger version policy, user-reported corrections increment the patch version. Test/CI corrections discovered while completing this candidate do not create another patch version.

### Security / compatibility

No encryption, password derivation, portability, offline behavior, backup format, 2.x compatibility, or 1.x read-only import behavior was changed.
