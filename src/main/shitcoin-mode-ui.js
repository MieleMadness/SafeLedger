'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');
let currentSettings = {};
let savePending = false;

function enabled() {
  return currentSettings && currentSettings.shitCoinMode === true;
}

function syncSettingsControl() {
  const input = document.getElementById('shitCoinMode');
  const save = document.getElementById('saveShitCoinMode');
  if (input) {
    input.checked = enabled();
    input.disabled = savePending;
  }
  if (save) save.disabled = savePending;
}

function applySettings(params) {
  if (params && params.settings) {
    currentSettings = params.settings;
    savePending = false;
    syncSettingsControl();
    queueMicrotask(patch);
  }
}

ipc.on('result-init-system', (_event, params) => applySettings(params));
ipc.on('result', (_event, params) => applySettings(params));
ipc.on('result-save-settings', (_event, params) => applySettings(params));

function replaceUnknownAssetIcons() {
  const active = enabled();
  for (const node of document.querySelectorAll('.coin-list-generic-icon, .coin-brand-generic')) {
    if (active) {
      if (node.dataset.shitCoinMode === 'true') continue;
      node.dataset.shitCoinMode = 'true';
      node.dataset.originalText = node.textContent || '';
      node.textContent = '💩';
      node.classList.add('shit-coin-icon');
      node.title = 'Unknown local asset icon — Shit Coin Mode';
      node.setAttribute('aria-label', 'Unknown asset icon');
      continue;
    }

    if (node.dataset.shitCoinMode === 'true') {
      node.textContent = node.dataset.originalText || '';
      delete node.dataset.shitCoinMode;
      delete node.dataset.originalText;
      node.classList.remove('shit-coin-icon');
      node.removeAttribute('title');
      node.removeAttribute('aria-label');
    }
  }
}

function addSettingsControl() {
  const area = document.getElementById('detailArea');
  if (!area || !area.querySelector('h1') || area.querySelector('h1').textContent !== 'Settings') return;
  if (area.querySelector('.shit-coin-mode-section')) {
    syncSettingsControl();
    return;
  }

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
  label.className = 'privacy-mode-toggle settings-field-label shit-coin-mode-option';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = 'shitCoinMode';
  input.checked = enabled();
  label.appendChild(input);
  label.appendChild(document.createTextNode(' Enable Shit Coin Mode'));
  section.appendChild(label);

  const save = document.createElement('button');
  save.type = 'button';
  save.id = 'saveShitCoinMode';
  save.className = 'btn btn-default settings-section-save';
  save.textContent = 'Save Shit Coin Mode';
  save.addEventListener('click', () => {
    if (savePending) return;
    savePending = true;
    input.disabled = true;
    save.disabled = true;
    ipc.send('save-settings', {
      newSettings: Object.assign({}, currentSettings, { shitCoinMode: input.checked === true })
    });
  });
  section.appendChild(save);

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

exports._test = { enabled, replaceUnknownAssetIcons, addSettingsControl, applySettings, syncSettingsControl };
