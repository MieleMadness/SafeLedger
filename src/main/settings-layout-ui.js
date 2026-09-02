'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');

const ORDER = Object.freeze([
  'Appearance',
  'Backup & Recovery',
  'Device & Storage Security',
  'Import SafeLedger 1.x Data',
  'Brute Force Protection',
  'Self-Destruct Protection',
  'Password'
]);

function sectionTitle(section) {
  const heading = section && section.querySelector('.settings-section-title');
  return heading ? String(heading.textContent || '').trim() : '';
}

function reorder() {
  const area = document.getElementById('detailArea');
  if (!area) return false;
  const heading = Array.from(area.querySelectorAll('h1')).find((node) => node.textContent === 'Settings');
  if (!heading) return false;

  const sections = Array.from(area.querySelectorAll(':scope > .settings-section'));
  if (!sections.length) return false;
  const byTitle = new Map(sections.map((section) => [sectionTitle(section), section]));

  for (const title of ORDER) {
    const section = byTitle.get(title);
    if (section) area.appendChild(section);
  }
  // Any future Settings section that is not yet in the explicit workflow order
  // stays visible immediately before Password instead of being dropped.
  const password = byTitle.get('Password');
  for (const section of sections) {
    if (ORDER.includes(sectionTitle(section))) continue;
    if (password) area.insertBefore(section, password);
    else area.appendChild(section);
  }
  return true;
}

function scheduleReorder() {
  // Self-Destruct is injected by its own settings module. Two short turns let
  // both modules finish rendering before the final deterministic ordering.
  setTimeout(() => setTimeout(reorder, 0), 0);
}

ipc.on('show-settings', scheduleReorder);
ipc.on('result-save-settings', scheduleReorder);

exports.ORDER = ORDER;
exports._test = { sectionTitle, reorder, scheduleReorder };
