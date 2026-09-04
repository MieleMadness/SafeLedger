# SafeLedger 2.6.27 workflow candidate

SafeLedger 2.6.27 carries forward the 2.6.26 application behavior unchanged and corrects one stale historical Web3 preset regression caught by CI.

## Carried-forward application changes

- `Run recovery drill` uses a bundled refresh/retest icon instead of the unsupported rectangle glyph.
- Exchange, Web3, and Website forms no longer auto-create a blank `Login method` row.
- Web3 forms no longer auto-create a blank `Connected wallet(s)` row.
- Existing populated legacy values remain preserved; only blank retired preset rows are removed during editing.
- Profiles, Vault Items, and Assets can independently collapse to explicit 56px icon rails.
- All navigation columns start expanded on each launch and the Detail area receives freed space when a rail collapses.

## CI correction

The 2.6.26 workflow passed the main regression suite through the 2.6.5 historical gate, then `hotfix-2.6.6-tests.js` failed because it explicitly required `Connected wallet(s)` to remain an automatically created Web3 field.

2.6.27 modernizes that historical gate so it now protects the intended behavior:

- deterministic direct Web3 preset rendering remains required;
- `Connected wallet(s)` and `Login method` are not forced into new Web3 forms;
- useful sensitive `2FA recovery / backup codes` support remains required;
- observer-free canonical rendering remains required.

No 2.6.26 application code is changed by this correction.

## Security and compatibility

No encrypted vault schema, AES-256-GCM, Argon2id, DEK/session boundary, SafeLedger 2.x compatibility, 1.x read-only import, backup/restore format, Self-Destruct semantics, Privacy Mode, Recovery Intelligence secret handling, portable-storage behavior, or runtime network behavior changes.

## Workflow rule

SafeLedger 2.6.27 is a **2.6.x workflow/test candidate**. Do **not** merge it to `master`. Promotion to `master` remains reserved for an intentional move to a new 2.x release number.
