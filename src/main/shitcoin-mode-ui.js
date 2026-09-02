'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');
let currentSettings = {};
let savePending = false;

function enabled() {
  return currentSettings && currentSettings.shitCoinMode === true;
}

function applySettings(params) {
  if (params && params.settings) {
    currentSettings = params.settings;
    savePending = false;
    queueMicrotask(patch);
  }
}

ipc.on('result-init-system', (_event, params) => applySettings(params));
ipc.on('result', (_event, params) => applySettings(params));
ipc.on('result-save-settings', (_event, params) => applySettings(params));

function replaceUnknownAssetIcons() {
  if (!enabled()) return;
  for (const node of document.querySelectorAll('.coin-list-generic-icon, .coin-brand-generic')) {
    if (node.dataset.shitCoinMode === 'true') continue;
    node.dataset.shitCoinMode = 'true';
    node.dataset.originalText = node.textContent || '';
    node.textContent = '💩';
    node.classList.add('shit-coin-icon');
    node.title = 'Unknown local asset icon — Shit Coin Mode';
    node.setAttribute('aria-label', 'Unknown asset icon');
  }
}

function addSettingsControl() {
  const area = document.getElementById('detailArea');
  if (!area || !area.querySelector('h1') || area.querySelector('h1').textContent !== 'Settings') return;
  if (area.querySelector('.shit-coin-mode-section')) return;

  const section = document.createElement('section');
  section.className = 'settings-section shit-coin-mode-section';
  const heading = document.createElement('h3');
  heading.className = 'settings-section-title';
  heading.textContent = 'Asset Display';
  section.appendChild(heading);
  const note = document.createElement('p');
  note.className = 'settings-section-note settings-section-intro';
  note.textContent = 'Shit Coin Mode is a visual-only joke setting. When enabled, assets that do not have a recognized local SafeLedger icon use a 💩 emoji instead of the generic ticker fallback. It never changes, ranks, deletes, filters, or classifies your assets.';
  section.appendChild(note);

  const label = document.createElement('label');
  label.className = 'appearance-option shit-coin-mode-option';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = 'shitCoinMode';
  input.checked = enabled();
  const strong = document.createElement('strong');
  strong.textContent = ' Shit Coin Mode';
  const description = document.createElement('span');
  description.textContent = ' Show 💩 for unknown asset icons.';
  label.appendChild(input);
  label.appendChild(strong);
  label.appendChild(description);
  section.appendChild(label);

  input.addEventListener('change', () => {
    if (savePending) return;
    savePending = true;
    input.disabled = true;
    ipc.send('save-settings', { newSettings: Object.assign({}, currentSettings, { shitCoinMode: input.checked }) });
  });

  const appearance = area.querySelector('.settings-section');
  if (appearance && appearance.parentNode) appearance.parentNode.insertBefore(section, appearance.nextSibling);
  else area.appendChild(section);
}

function patch() {
  addSettingsControl();
  replaceUnknownAssetIcons();
}

function start() {
  patch();
  const observer = new MutationObserver(() => queueMicrotask(patch));
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports._test = { enabled, replaceUnknownAssetIcons, addSettingsControl, applySettings };
