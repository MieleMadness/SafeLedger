'use strict';

require('./startup-ui.js');
require('./renderer.js');
require('./lockout-ui-enhancements.js');
require('./security-enhancements.js');
require('./crypto-ui-bridge.js');
require('./search-enhancements.js');

document.documentElement.dataset.safeLedgerRendererReady = 'true';
