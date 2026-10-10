# Phase 3 Data Ownership Contract

SafeLedger 2.6.51 uses this rule for persisted data:

> The renderer may request a change. It does not provide the object that becomes the new source of truth.

For profiles, vault items, assets, and generic settings, the trusted main process must begin from authoritative local data, validate the requested mutation, apply only fields owned by that mutation, persist the result atomically/encrypted as appropriate, and return the authoritative saved state to the renderer.

Temporary navigation selections are response/UI state and are not persisted as recovery data.

Existing unknown fields are preserved when an authoritative entity is edited so compatibility data is not destroyed. Newly supplied unknown renderer fields do not become stored data.

Security-owned settings—including retry counters, current lock state, Self-Destruct state, and backup verification evidence—cannot be changed through the generic renderer settings save path.

A compatibility adapter is acceptable only when it narrows an older request shape into a bounded mutation and proves the request against authoritative state. It must never restore whole-object renderer write authority.
