'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const version = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));
const atLeast2515 = version[0] > 2 ||
  (version[0] === 2 && version[1] > 5) ||
  (version[0] === 2 && version[1] === 5 && version[2] >= 15);
assert(atLeast2515, 'build must be SafeLedger 2.5.15 or later');

const css = read('src/main/css/ui-current.css');
assert(css.includes('#loginBtn'), 'login button must receive the shared SafeLedger button treatment');
assert(css.includes('.btn:not(:disabled):hover'), 'shared button hover styling must cover standard buttons');
assert(css.includes('outline: 2px solid var(--sl-primary) !important;'), 'button highlight must use the 2px SafeLedger focus frame');
assert(css.includes('outline-offset: -2px !important;'), 'button highlight must stay inside the button footprint');
assert(css.includes('box-shadow: var(--sl-shadow-soft) !important;'), 'visual buttons must use the restrained Emergency Lock shadow');
assert(!css.includes('0 0 0 3px'), 'current UI must not reintroduce the old outer glow');

const index = read('src/main/index.html');
assert(index.includes('./css/ui-current.css'), 'consolidated current UI layer must load after prior refinements');

const rendererEntry = read('src/main/renderer-entry.js');
assert(!rendererEntry.includes("require('./vault-language-ui.js')"),
  'Vault Item terminology must be rendered directly instead of restored by the retired language observer.');
assert(!rendererEntry.includes("require('./recovery-intelligence-vault-overview-ui.js')"),
  'Recovery Intelligence must not return as a post-render Vault Overview observer.');
assert.strictEqual(fs.existsSync(path.join(root, 'src/main/recovery-intelligence-vault-overview-ui.js')), false,
  'The retired Recovery Intelligence Vault Overview repair module must stay removed.');

// Keep this historical regression renderer-free. dashboard-ui.js imports live
// renderer-adjacent code, so source contracts are used here instead of requiring
// the browser-facing module from plain Node.
const dashboardSource = read('src/main/dashboard-ui.js');
assert(dashboardSource.includes("const recoveryIntelligenceUi = require('./recovery-intelligence-dashboard-ui');"),
  'Vault Overview must own the Recovery Intelligence renderer directly.');
assert(dashboardSource.includes('typeof window.safeLedgerApi.getRecoveryIntelligence'),
  'Vault Overview must request Recovery Intelligence in the same dashboard data flow.');
assert(dashboardSource.includes('const [result, storage, backupResult, activityResult, intelligenceResult] = await Promise.all(['),
  'Recovery Intelligence should load with the rest of the dashboard state rather than in a later repair pass.');
assert(dashboardSource.includes('if (intelligence) recoveryIntelligenceUi.renderIntelligence(area, intelligence);'),
  'Vault Overview must render optional Recovery Intelligence directly during its canonical render.');
assert(!dashboardSource.includes('MutationObserver'),
  'Vault Overview must not depend on a DOM observer to restore Recovery Intelligence.');

assert(dashboardSource.includes('function vaultContentsLabel(counts = {})'),
  'Vault Overview must own its inventory summary directly.');
for (const phrase of [
  "quantity(hardware, 'hardware wallet')",
  "quantity(software, 'software wallet')",
  "quantity(exchanges, 'exchange account')",
  "quantity(services, 'Web / Web3 service')",
  'Add a wallet, exchange account, or Web / Web3 service to begin building your vault inventory.',
  "return `Vault contents: ${parts.join(' • ')}`;"
]) {
  assert(dashboardSource.includes(phrase), `missing direct Vault Overview inventory contract: ${phrase}`);
}
assert(dashboardSource.includes("makeStat('Vault Items', vaultItems)"),
  'Vault Overview inventory must create the Vault Items stat directly.');
assert(
  dashboardSource.includes('Choose Resolve to open the Vault Item that needs work.') &&
  dashboardSource.includes("makeResolveButton('Resolve', () => openWallet(item)"),
  'Vault Overview recovery actions must use Vault Item terminology and expose the direct Resolve action.'
);
assert(dashboardSource.includes("list.className = 'dashboard-attention-gaps';"),
  'Recovery Needs Attention must expose recovery gaps directly rather than relying on a separate scorecard section.');

const groupSource = read('src/main/group.js');
for (const phrase of [
  'Vault Items appear after a Profile is selected.',
  'No vault items yet',
  'Add a Vault Item to build this Profile recovery plan.'
]) {
  assert(groupSource.includes(phrase), `missing direct Vault Item terminology contract: ${phrase}`);
}

const globalSearchSource = read('src/main/global-search-ui.js');
assert(globalSearchSource.includes('Search Profiles, Vault Items, and Assets without indexing secret values.'),
  'Global Search introduction must use Vault Item terminology directly.');
assert(globalSearchSource.includes("return type === 'wallet' ? 'VAULT ITEM'"),
  'Global Search must display internal wallet results as Vault Items directly.');

console.log('PASS SafeLedger 2.5.15+ shared button aesthetics, directly rendered Vault Item terminology, consolidated Recovery Needs Attention gaps, and direct Recovery Intelligence dashboard ownership.');
