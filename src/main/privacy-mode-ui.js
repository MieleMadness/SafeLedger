'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');
const securityUi = require('./security-ui');

let currentSettings = { privacyMode: true };

function remember(settings) {
  if (!settings) return;
  currentSettings = Object.assign({}, settings);
  securityUi.setPrivacyMode(currentSettings.privacyMode !== false);
}

function render() {
  const area = document.getElementById('detailArea');
  if (!area || document.getElementById('privacyModeSection')) return;
  const settingsHeading = Array.from(area.querySelectorAll('h1')).find((node) => node.textContent === 'Settings');
  if (!settingsHeading) return;

  const section = document.createElement('section');
  section.id = 'privacyModeSection';
  section.className = 'settings-section';

  const heading = document.createElement('h3');
  heading.className = 'settings-section-title';
  heading.textContent = 'Privacy Mode';
  section.appendChild(heading);

  const note = document.createElement('p');
  note.className = 'settings-section-note settings-section-intro';
  note.textContent = 'When enabled, sensitive values stay collapsed and their Copy/QR shortcuts remain hidden until you deliberately reveal the field. Public addresses and recovery-health metadata remain usable.';
  section.appendChild(note);

  const label = document.createElement('label');
  label.className = 'privacy-mode-toggle settings-field-label';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'privacyModeEnabled';
  checkbox.checked = currentSettings.privacyMode !== false;
  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(' Enable Privacy Mode'));
  section.appendChild(label);

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn btn-default settings-section-save';
  save.textContent = 'Save Privacy Mode';
  save.addEventListener('click', () => {
    save.disabled = true;
    ipc.send('save-settings', {
      newSettings: Object.assign({}, currentSettings, { privacyMode: checkbox.checked === true })
    });
  });
  section.appendChild(save);

  const appearanceSection = Array.from(area.querySelectorAll('.settings-section')).find((candidate) => {
    const title = candidate.querySelector('.settings-section-title');
    return title && title.textContent === 'Appearance';
  });
  if (appearanceSection && appearanceSection.nextSibling) area.insertBefore(section, appearanceSection.nextSibling);
  else area.appendChild(section);
}

ipc.on('result-init-system', (_event, params) => remember(params && params.settings));
ipc.on('result-save-settings', (_event, params) => {
  remember(params && params.settings);
  setTimeout(render, 0);
});
ipc.on('show-settings', () => setTimeout(render, 0));

exports._test = { remember, render };
