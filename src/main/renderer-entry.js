'use strict';

require('./app-appearance.js');
require('./startup-ui.js');
require('./renderer.js');
require('./privacy-mode-ui.js');
require('./dashboard-ui.js');
require('./recovery-intelligence-dashboard-ui.js');
require('./activity-history-ui.js');
require('./settings-shortcut-ui.js');
require('./self-destruct-settings-ui.js');
require('./settings-layout-ui.js');
require('./lockout-ui-enhancements.js');
require('./security-enhancements.js');
require('./crypto-ui-bridge.js');
require('./search-enhancements.js');
require('./profile-wallet-picker-ui.js');
require('./sensitive-control-icons-ui.js');
require('./vault-item-ui.js');

document.documentElement.dataset.safeLedgerRendererReady = 'true';
