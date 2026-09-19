'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const iconModel = require('../src/main/profile-icon-model');
const profileIconUi = require('../src/main/profile-icon-ui');
const web3Icons = require('../src/main/web3-icons');
const serviceCatalog = require('../src/main/service-catalog');
const dataWrite = require('../src/main/data-write-service');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

assert.deepStrictEqual(iconModel.WEB3_CATEGORIES, ['tokens', 'networks', 'wallets', 'exchanges']);
assert.strictEqual(iconModel.normalizeSelection(null), null);
assert.deepStrictEqual(iconModel.normalizeSelection({ type: 'web3', category: 'tokens', key: 'BTC' }), { type: 'web3', category: 'tokens', key: 'BTC' });
assert.deepStrictEqual(iconModel.normalizeSelection({ type: 'service', key: 'github' }), { type: 'service', key: 'GitHub' });
assert.deepStrictEqual(iconModel.normalizeSelection({ type: 'local', key: 'FA-USER' }), { type: 'local', key: 'fa-user' });
assert.throws(() => iconModel.normalizeSelection({ type: 'web3', category: 'unknown', key: 'BTC' }), /Invalid crypto Profile icon/);
assert.throws(() => iconModel.normalizeSelection({ type: 'local', key: 'fa-not-real' }), /Invalid general Profile icon/);
assert.throws(() => iconModel.normalizeSelection({ type: 'service', key: '<script>' }), /Invalid service Profile icon/);

for (const category of iconModel.WEB3_CATEGORIES) {
  const sourceEntries = web3Icons.entries(category);
  const pickerEntries = profileIconUi.entries(category);
  assert(sourceEntries.length > 0, `${category} icon manifest should be populated by prepare:icons.`);
  assert.strictEqual(web3Icons.entries(category), sourceEntries, `${category} Web3 entries must be cached instead of rebuilt and re-sorted on every icon render.`);
  assert.strictEqual(profileIconUi.entries(category), pickerEntries, `${category} Profile picker catalog must be cached instead of rebuilt on every render.`);
  for (const source of sourceEntries) {
    assert(String(source.src || '').startsWith(`./assets/token-icons/${category}/`), `${category}:${source.key} must stay local.`);
    assert.strictEqual(web3Icons.entry(category, source.key), source, `${category}:${source.key} must resolve through the constant-time cached entry lookup.`);
    assert(pickerEntries.some((entry) => entry.selection.type === 'web3' && entry.selection.category === category && entry.selection.key === source.key),
      `Profile picker must expose every packaged ${category} icon: ${source.key}`);
  }
}
assert(profileIconUi.entries('tokens').some((entry) => entry.label === 'Chain Games'), 'Profile Crypto picker must include the SafeLedger-owned Chain Games icon.');

const serviceEntries = profileIconUi.entries('services');
assert.strictEqual(serviceEntries.length, serviceCatalog.SERVICES.length, 'Profile picker must expose the complete existing SafeLedger service icon catalog.');
for (const service of serviceCatalog.SERVICES) {
  assert(serviceEntries.some((entry) => entry.selection.type === 'service' && entry.selection.key === service.name), `Missing service Profile icon: ${service.name}`);
}

const localCss = read('src/main/css/local-icons.css').replace(/\/\*[\s\S]*?\*\//g, '');
const definedLocal = new Set(Array.from(localCss.matchAll(/\.(?:fa|glyphicon)-[a-z0-9]+(?:-[a-z0-9]+)*/gi), (match) => match[0].slice(1).toLowerCase()));
definedLocal.delete('fa-spin');
const selectableLocal = new Set(iconModel.GENERAL_ICONS.map((entry) => entry.key));
for (const key of selectableLocal) assert(definedLocal.has(key), `Selectable General Profile icon must have local artwork: ${key}`);
assert.strictEqual(profileIconUi.entries('general').length, selectableLocal.size);

const removedDuplicates = [
  'fa-folder-open',
  'fa-unlock-alt',
  'glyphicon-save',
  'fa-plus-circle',
  'glyphicon-plus',
  'fa-minus-circle',
  'fa-exclamation-triangle'
];
for (const key of removedDuplicates) {
  assert(!selectableLocal.has(key), `Duplicate General Profile icon must not be selectable: ${key}`);
  assert(!definedLocal.has(key), `Duplicate local icon alias must be removed from CSS: ${key}`);
  assert.throws(() => iconModel.normalizeSelection({ type: 'local', key }), /Invalid general Profile icon/);
}

const normalizedPatch = dataWrite.normalizeProfilePatch({
  name: 'Cold Storage',
  profileIcon: { type: 'web3', category: 'wallets', key: 'ledger' },
  injectedIconHtml: '<img src=x onerror=alert(1)>'
});
assert.deepStrictEqual(normalizedPatch.profileIcon, { type: 'web3', category: 'wallets', key: 'ledger' });
assert.strictEqual(normalizedPatch.injectedIconHtml, undefined, 'Profile icon persistence must not grant renderer authority over arbitrary markup.');
assert.throws(() => dataWrite.normalizeProfilePatch({ name: 'Bad', profileIcon: { type: 'local', key: 'fa-evil' } }), /Invalid general Profile icon/);

const profileSource = read('src/main/profile.js');
assert(profileSource.includes("require('./profile-icon-ui')"));
assert(profileSource.includes('createProfileIconControls(grid, profile)'));
assert(profileSource.includes('nextProfile.profileIcon = iconPicker.getSelection()'));
assert(profileSource.includes("createProfileVisual(item, 'profile-list-icon'"), 'Selected Profile icons must render in the Profile list.');
assert(profileSource.includes("createProfileVisual(profile, 'profile-detail-icon'"), 'Selected Profile icons must render in Profile detail.');

const web3Source = read('src/main/web3-icons.js');
assert(web3Source.includes('const entriesCache = new Map()'), 'Web3 catalog entries must have one cached owner.');
assert(web3Source.includes('function entry(category, key)'), 'Web3 icons must expose direct canonical entry lookup for Profile rendering.');
assert(web3Source.includes("img.decoding = 'async'"), 'Local SVG image decode must not block Profile UI work unnecessarily.');

const pickerSource = read('src/main/profile-icon-ui.js');
for (const label of ['Crypto', 'Networks', 'Wallets', 'Exchanges', 'Services', 'General']) assert(pickerSource.includes(`label: '${label}'`));
assert(pickerSource.includes("search.type = 'search'"));
assert(pickerSource.includes("clear.textContent = 'Use initial'"));
assert(pickerSource.includes("document.getElementById('inputName')"), 'Use initial preview must read the current Profile name input.');
assert(pickerSource.includes("nameInput.addEventListener('input'"), 'Use initial preview must update while the Profile name changes.');
assert(pickerSource.includes("createInitial(currentProfileName(), 'profile-icon-picker-preview-initial')"), 'Use initial must preview the current Profile initial instead of an empty-name question mark.');
assert(!pickerSource.includes("createInitial('', 'profile-icon-picker-preview-initial')"), 'Use initial preview must not render the empty-name fallback.');
assert(pickerSource.includes('web3Icons.entry(icon.category, icon.key)'), 'Profile visuals must use direct Web3 entry lookup instead of scanning the entire category.');
assert(!pickerSource.includes('web3Icons.entries(icon.category).find'), 'Profile rendering must never rebuild/scan a complete Web3 category for one icon.');
assert(profileIconUi._test.BATCH_SIZE >= 24 && profileIconUi._test.BATCH_SIZE <= 96, 'Profile picker must cap each DOM render batch to a small visible working set.');
assert(pickerSource.includes('document.createDocumentFragment()'), 'Profile picker batches should be appended with a DocumentFragment.');
assert(pickerSource.includes('appendNextBatch'), 'Profile picker must incrementally append icon batches.');
assert(pickerSource.includes("grid.addEventListener('scroll'"), 'Profile picker must lazily reveal additional icons while scrolling.');

const profileCss = read('src/main/css/profile-setup.css');
for (const selector of ['.profile-icon-picker', '.profile-icon-picker-grid', '.profile-icon-option', '.profile-icon-picker-more', '.profile-detail-heading', '.profile-list-icon']) {
  assert(profileCss.includes(selector), `Profile icon UI styling is missing ${selector}.`);
}

assert(profileSource.includes("const section = document.createElement('section');"), 'Profile icon picker should use a plain section instead of a bordered fieldset.');
assert(profileSource.includes("heading.className = 'product-section-title'"), 'Profile icon heading must use the shared menu-section heading style.');
assert(profileSource.includes("intro.className = 'profile-icon-note'"), 'Profile icon helper copy must use its shared-size note style.');
assert(!profileSource.includes("legend.textContent = 'Profile icon'"), 'Profile icon picker must not restore the old fieldset legend/ring.');

function selectorBody(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, (character) => `\\${character}`);
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert(match, `Missing CSS rule for ${selector}.`);
  return match[1];
}
const iconSectionCss = selectorBody(profileCss, '.profile-icon-section');
assert(/padding:\s*0\s*;/.test(iconSectionCss) && /border:\s*0\s*;/.test(iconSectionCss),
  'Profile icon section must remain borderless with no outer card padding.');
const iconNoteCss = selectorBody(profileCss, '.profile-icon-note');
assert(/font-size:\s*12px\s*;/.test(iconNoteCss),
  'Profile icon helper copy must match the compact helper text used by other menu sections.');
const iconSearchCss = selectorBody(profileCss, '.profile-icon-picker-search');
const searchGap = iconSearchCss.match(/margin-bottom:\s*(\d+)px\s*;/);
assert(searchGap && Number(searchGap[1]) >= 12,
  'Profile icon search needs visible breathing room before the icon tiles.');
const iconOptionCss = selectorBody(profileCss, '.profile-icon-option');
assert(iconOptionCss.includes('var(--sl-border-strong'),
  'Profile icon tiles must use the stronger shared border for definition.');
assert(iconOptionCss.includes('var(--sl-surface-soft'),
  'Profile icon tiles must use the shared soft surface so their boundaries remain visible across themes.');

console.log(`PASS Profile icon picker exposes all packaged Web3 icons, ${serviceEntries.length} service icons, ${selectableLocal.size} curated General icons, previews the live Profile initial, caches catalog lookups, and renders large categories in small lazy batches.`);
