'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');

let currentSettings = { scrubContentAfterRetries: false };

function remember(settings) {
  if (!settings) return;
  currentSettings = Object.assign({}, settings);
}

function render() {
  const area = document.getElementById('detailArea');
  if (!area || document.getElementById('selfDestructSettingsSection')) return;
  const settingsHeading = Array.from(area.querySelectorAll('h1')).find((node) => node.textContent === 'Settings');
  if (!settingsHeading) return;

  const section = document.createElement('section');
  section.id = 'selfDestructSettingsSection';
  section.className = 'settings-section';

  const heading = document.createElement('h3');
  heading.className = 'settings-section-title';
  heading.textContent = 'Self-Destruct Protection';
  section.appendChild(heading);

  const note = document.createElement('p');
  note.className = 'settings-section-note settings-section-intro';
  note.textContent = 'Optional protection for high-risk situations. When enabled, SafeLedger permanently destroys the encrypted vault files after all configured failed-login lockouts are exhausted.';
  section.appendChild(note);

  const warning = document.createElement('div');
  warning.className = 'settings-protection-note';
  warning.textContent = 'This can permanently destroy your SafeLedger vault data. Keep a verified backup on separate storage before enabling it.';
  section.appendChild(warning);

  const label = document.createElement('label');
  label.className = 'privacy-mode-toggle settings-field-label';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'selfDestructProtectionEnabled';
  checkbox.checked = currentSettings.scrubContentAfterRetries === true;
  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(' Enable Self-Destruct Protection'));
  section.appendChild(label);

  checkbox.addEventListener('change', async () => {
    const previous = currentSettings.scrubContentAfterRetries === true;
    const desired = checkbox.checked === true;
    checkbox.disabled = true;
    try {
      if (!window.safeLedgerApi || typeof window.safeLedgerApi.setSelfDestructProtection !== 'function') {
        throw new Error('Self-Destruct settings are unavailable in this build.');
      }
      const result = await window.safeLedgerApi.setSelfDestructProtection(desired);
      checkbox.checked = result && result.enabled === true;
    } catch (err) {
      checkbox.checked = previous;
      window.alert(err && err.message ? err.message : 'Unable to update Self-Destruct Protection.');
    } finally {
      checkbox.disabled = false;
    }
  });

  area.appendChild(section);
}

ipc.on('result-init-system', (_event, params) => remember(params && params.settings));
ipc.on('result-save-settings', (_event, params) => {
  remember(params && params.settings);
  setTimeout(render, 0);
});
ipc.on('show-settings', () => setTimeout(render, 0));

exports._test = { remember, render };
