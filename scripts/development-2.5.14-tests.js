'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function testBottomAddActionsMatchEmergencyHighlightLanguage() {
  const css = read('src/main/css/ui-current.css');
  for (const id of ['#addVault', '#addGroup', '#addRecord']) {
    assert(css.includes(id), `${id} should be covered by the current action-button refinement.`);
  }
  assert(css.includes('outline: 2px solid var(--sl-primary) !important;'), 'Bottom add actions should use the same 2px highlight thickness as Emergency Lock.');
  assert(css.includes('outline-offset: -2px !important;'), 'Bottom add action highlight should sit inside the button footprint.');
  assert(css.includes('border-width: 1px !important;'), 'Base add-button border should remain a stable 1px.');
  assert(css.includes('box-shadow: none !important;'), 'The historical 2.5.14 behavior must remain represented without a mismatched shadow halo at that layer.');
  assert(css.includes('transform: none !important;'), 'Hover/focus should not resize or shift the add buttons.');
}

function testRefinementIsLoaded() {
  const html = read('src/main/index.html');
  assert(html.includes('./css/ui-current.css'), 'SafeLedger should load the consolidated current UI stylesheet after prior UI layers.');
}

function testDevelopmentVersionAtLeast2514() {
  const pkg = JSON.parse(read('package.json'));
  const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
  const atLeast2514 = parts[0] > 2 ||
    (parts[0] === 2 && parts[1] > 5) ||
    (parts[0] === 2 && parts[1] === 5 && parts[2] >= 14);
  assert(atLeast2514, 'SafeLedger builds after this feature should remain at 2.5.14 or later.');
}

testBottomAddActionsMatchEmergencyHighlightLanguage();
testRefinementIsLoaded();
testDevelopmentVersionAtLeast2514();
console.log('PASS SafeLedger 2.5.14+ bottom add actions preserve the Emergency Lock hover/focus aesthetics.');