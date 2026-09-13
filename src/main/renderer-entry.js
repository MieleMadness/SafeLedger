'use strict';

// Keep renderer startup explicit: global shell/bootstrap helpers first, then the
// single workspace coordinator, followed by the independent Activity view.
require('./app-appearance.js');
require('./app-menu-ui.js');
require('./startup-ui.js');
require('./renderer.js');
require('./activity-history-ui.js');

document.documentElement.dataset.safeLedgerRendererReady = 'true';
