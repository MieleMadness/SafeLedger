'use strict';

require('./app-appearance.js');
require('./app-menu-ui.js');
require('./startup-ui.js');
require('./renderer.js');
require('./column-collapse-ui.js');
require('./dashboard-ui.js');
require('./activity-history-ui.js');
require('./settings-shortcut-ui.js');
require('./top-action-lock-ui.js');
require('./lockout-ui-enhancements.js');
require('./security-enhancements.js');
require('./crypto-ui-bridge.js');

document.documentElement.dataset.safeLedgerRendererReady = 'true';
