'use strict';

// Transitional renderer compatibility stub. SafeLedger 2.x storage lives in
// robust-vault.js in the main process. The legacy vault implementation was
// removed in 2.0.48; this empty module only prevents the old renderer import
// from failing until the renderer itself is consolidated in the UI refactor.
module.exports = Object.freeze({});
