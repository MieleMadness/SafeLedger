'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function testBottomAddActionsMatchEmergencyHighlightLanguage() {
  const css = read('src/main/css/ui-2.5.14.css');
  for (const id of ['#addVault', '#addGroup', '#addRecord']) {
    assert(css.includes(id), `${id} should be covered by the 2.5.14 action-button refinement.`);
  }
  assert(css.includes('outline: 2px solid var(--sl-primary) !important;'), 'Bottom add actions should use the same 2px highlight thickness as Emergency Lock.');
  assert(css.includes('outline-offset: -2px !important;'), 'Bottom add action highlight should sit inside the button footprint.');
  assert(css.includes('border-width: 1px !important;'), 'Base add-button border should remain a stable 1px.');
  assert(css.includes('box-shadow: none !important;'), 'The 2.5.14 layer should not add a mismatched shadow halo.');
  assert(css.includes('transform: none !important;'), 'Hover/focus should not resize or shift the add buttons.');
}

function testRefinementIsLoaded() {
  const html = read('src/main/index.html');
  assert(html.includes('./css/ui-2.5.14.css'), 'SafeLedger should continue loading the 2.5.14 UI refinement after prior UI layers.');
}

function testDevelopmentVersionAtLeast214() {
  const pkg = JSON.parse(read('package.json'));
  const parts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
  assert(
    parts[0] === 2 && parts[1] === 5 && parts[2] >= 14,
    'SafeLedger development builds after this feature should remain at 2.5.14 or later.'
  );
}

testBottomAddActionsMatchEmergencyHighlightLanguage();
testRefinementIsLoaded();
testDevelopmentVersionAtLeast214();
console.log('PASS SafeLedger 2.5.14+ bottom add actions preserve the Emergency Lock hover/focus aesthetics.');
