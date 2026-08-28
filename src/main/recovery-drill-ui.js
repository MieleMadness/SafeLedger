'use strict';

const detailActions = require('./detail-actions');
const recoveryDrill = require('./recovery-drill');

function appendText(parent, tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function render(params = {}) {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const group = params.group || {};
  area.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'recovery-drill-header';
  appendText(header, 'h1', '', 'Recovery Drill');
  appendText(header, 'p', 'recovery-drill-wallet', `Wallet: ${params.walletName || 'Wallet'}`);
  area.appendChild(header);

  const privacy = document.createElement('div');
  privacy.className = 'recovery-drill-privacy';
  const privacyIcon = document.createElement('i');
  privacyIcon.className = 'fa fa-shield';
  privacyIcon.setAttribute('aria-hidden', 'true');
  privacy.appendChild(privacyIcon);
  appendText(
    privacy,
    'div',
    '',
    'This drill never displays or asks you to type recovery phrases, private keys, passwords, PINs, or sensitive custom-field values. Confirm each step using your real-world recovery plan.'
  );
  area.appendChild(privacy);

  const eligible = recoveryDrill.canComplete(group);
  if (!eligible) {
    appendText(
      area,
      'div',
      'recovery-drill-warning',
      'A recovery method is not documented yet. You can review the checklist, but SafeLedger will not mark the drill complete until recovery information or a recovery-material location is documented for this wallet.'
    );
  }

  appendText(area, 'p', 'recovery-drill-intro', 'Check every item only after you have physically or operationally confirmed it.');

  const list = document.createElement('div');
  list.className = 'recovery-drill-list';
  const checkboxes = [];
  for (const [index, step] of recoveryDrill.buildSteps(group).entries()) {
    const row = document.createElement('label');
    row.className = 'recovery-drill-step';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', step.title);
    checkboxes.push(checkbox);
    row.appendChild(checkbox);

    const body = document.createElement('span');
    body.className = 'recovery-drill-step-body';
    appendText(body, 'span', 'recovery-drill-step-number', `Step ${index + 1}`);
    appendText(body, 'strong', 'recovery-drill-step-title', step.title);
    appendText(body, 'span', 'recovery-drill-step-text', step.text);
    row.appendChild(body);
    list.appendChild(row);
  }
  area.appendChild(list);

  const storageNote = document.createElement('div');
  storageNote.className = 'recovery-drill-storage-note';
  appendText(storageNote, 'strong', '', 'What SafeLedger records: ');
  storageNote.appendChild(document.createTextNode('only the successful drill completion time and the refreshed Last Verified time. Individual checklist answers are not stored.'));
  area.appendChild(storageNote);

  const allConfirmed = () => checkboxes.length > 0 && checkboxes.every((checkbox) => checkbox.checked);
  const complete = (_event, button) => {
    if (!eligible) return alert('Document a recovery method or recovery-material location before completing this drill.');
    if (!allConfirmed()) return alert('Confirm every recovery drill step before marking the drill complete.');
    if (button) button.disabled = true;
    if (typeof params.onComplete === 'function') params.onComplete(recoveryDrill.completionPatch(), button);
  };

  detailActions.set([
    {
      icon: 'fa-times',
      title: 'Cancel recovery drill',
      className: 'detail-action-cancel',
      onClick: () => { if (typeof params.onCancel === 'function') params.onCancel(); }
    },
    {
      icon: 'fa-check-circle',
      title: 'Complete recovery drill',
      className: 'recovery-drill-complete-action',
      onClick: complete
    }
  ]);
  detailActions.setDetailMode('view');

  const dock = document.getElementById('detailActionArea');
  const completeButton = dock && dock.querySelector('[aria-label="Complete recovery drill"]');
  const syncCompleteState = () => {
    if (completeButton) completeButton.disabled = !eligible || !allConfirmed();
  };
  checkboxes.forEach((checkbox) => checkbox.addEventListener('change', syncCompleteState));
  syncCompleteState();
}

exports.render = render;
exports._test = { appendText };
