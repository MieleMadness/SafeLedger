'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const security = read('src/main/security-ui.js');

assert(security.includes("stateIcon.className = open ? 'fa fa-minus' : 'fa fa-plus';"),
  'View-mode sensitive rows should update one existing plus/minus icon directly in the control owner.');
assert(security.includes('function syncSensitiveSummary(details, summary, stateIcon)'));
assert(security.includes("details.addEventListener('toggle', () =>"),
  'Sensitive disclosure state must follow the real details toggle event.');
assert(security.includes('syncSensitiveSummary(details, summary, stateIcon);'),
  'The canonical control owner must keep icon/title/ARIA state synchronized.');
assert(security.includes("summary.setAttribute('aria-label', action);"),
  'Disclosure accessibility state must be updated with the visible control state.');
assert(!security.includes('MutationObserver'),
  'Sensitive-control correctness must not depend on a document observer.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/sensitive-control-icons-ui.js')), false,
  'The old sensitive-control post-render repair module must stay retired.');

console.log('PASS SafeLedger sensitive disclosure icons, titles, and ARIA state update directly with no observer render loop.');
