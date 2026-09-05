'use strict';

const detailActions = require('./detail-actions');
const recoveryDrill = require('./recovery-drill');
const bip39 = require('./bip39-validator');

function appendText(parent, tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function bip39Message(result) {
  if (!result || result.supported !== true) return 'Unable to validate the mnemonic locally.';
  if (result.valid) return `Valid BIP39 English mnemonic structure and checksum (${result.wordCount} words).`;
  if (result.reason === 'word-count') return 'Not a supported BIP39 word count. Use 12, 15, 18, 21, or 24 words.';
  if (result.reason === 'unknown-word') return 'One or more words are not in the official BIP39 English word list.';
  if (result.reason === 'checksum') return 'All words are recognized, but the BIP39 checksum does not match.';
  return 'The mnemonic could not be validated as BIP39.';
}

function appendOptionalBip39Check(area) {
  const section = document.createElement('section');
  section.className = 'recovery-drill-validation';
  appendText(section, 'h3', 'product-section-title', 'Optional BIP39 Check');
  appendText(
    section,
    'p',
    'recovery-drill-intro',
    'If this vault item uses a BIP39 seed phrase, you may validate its word list and checksum locally. SafeLedger does not save, log, copy, or transmit what you enter here.'
  );

  const input = document.createElement('input');
  input.type = 'password';
  input.className = 'form-control';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.maxLength = 4096;
  input.placeholder = 'Enter BIP39 words for this one-time check';
  input.setAttribute('aria-label', 'Temporary BIP39 mnemonic');
  section.appendChild(input);

  const actions = document.createElement('div');
  actions.className = 'settings-section-actions recovery-drill-validation-actions';
  const validate = document.createElement('button');
  validate.type = 'button';
  validate.className = 'btn btn-default';
  validate.textContent = 'Validate Locally';
  actions.appendChild(validate);
  section.appendChild(actions);

  const resultText = document.createElement('p');
  resultText.className = 'recovery-drill-validation-result';
  resultText.setAttribute('aria-live', 'polite');
  section.appendChild(resultText);

  validate.addEventListener('click', () => {
    const temporaryMnemonic = input.value;
    if (!temporaryMnemonic.trim()) {
      resultText.textContent = 'Enter a mnemonic to run the optional local check.';
      return;
    }
    const result = bip39.validateMnemonic(temporaryMnemonic);
    input.value = '';
    resultText.textContent = bip39Message(result);
    resultText.className = `recovery-drill-validation-result ${result.valid ? 'is-ready' : 'is-review'}`;
  });

  area.appendChild(section);
}

function documentationReminder(group = {}) {
  if (recoveryDrill.canComplete(group)) return '';
  if (group.lastRecoveryDrill || group.lastVerified) {
    return 'Documentation reminder: this Recovery Validation may be current, but SafeLedger still does not have a recovery method, recovery location, or recovery instructions documented for this vault item. Completing or verifying a drill records that you tested the process; it does not create the missing recovery documentation. Recovery Readiness will remain incomplete until at least one part of the recovery plan is documented from Edit Vault Item.';
  }
  return 'Documentation reminder: SafeLedger does not have a recovery method, recovery location, or recovery instructions documented for this vault item yet. You can still complete this Recovery Validation checklist, but Recovery Readiness will remain incomplete until at least one part of the recovery plan is documented from Edit Vault Item.';
}

function render(params = {}) {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const group = params.group || {};
  area.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'recovery-drill-header';
  appendText(header, 'h1', '', 'Recovery Validation');
  appendText(header, 'p', 'recovery-drill-wallet', `Vault Item: ${params.walletName || 'Vault Item'}`);
  area.appendChild(header);

  appendOptionalBip39Check(area);

  const privacy = document.createElement('div');
  privacy.className = 'recovery-drill-privacy';
  const privacyIcon = document.createElement('i');
  privacyIcon.className = 'fa fa-lock';
  privacyIcon.setAttribute('aria-hidden', 'true');
  privacy.appendChild(privacyIcon);
  appendText(
    privacy,
    'div',
    '',
    'This guided test does not require you to reveal recovery phrases, private keys, passwords, PINs, or sensitive custom-field values. Confirm the checklist using your real-world recovery plan. The optional BIP39 checker is local-only and clears its input immediately after validation.'
  );
  area.appendChild(privacy);

  const reminder = documentationReminder(group);
  if (reminder) appendText(area, 'div', 'recovery-drill-warning', reminder);

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
  storageNote.appendChild(document.createTextNode('only the successful Recovery Validation completion time and the refreshed Last Verified time. Individual checklist answers are not stored. Optional BIP39 input and results are also not stored.'));
  area.appendChild(storageNote);

  const allConfirmed = () => checkboxes.length > 0 && checkboxes.every((checkbox) => checkbox.checked);
  const complete = (_event, button) => {
    if (!allConfirmed()) return alert('Confirm every Recovery Validation step before marking the validation complete.');
    if (button) button.disabled = true;
    if (typeof params.onComplete === 'function') params.onComplete(recoveryDrill.completionPatch(), button);
  };

  detailActions.set([
    {
      icon: 'fa-times',
      title: 'Cancel Recovery Validation',
      className: 'detail-action-cancel',
      onClick: () => { if (typeof params.onCancel === 'function') params.onCancel(); }
    },
    {
      icon: 'fa-check-circle',
      title: 'Complete Recovery Validation',
      className: 'recovery-drill-complete-action',
      onClick: complete
    }
  ]);
  detailActions.setDetailMode('view');

  const dock = document.getElementById('detailActionArea');
  const completeButton = dock && dock.querySelector('[aria-label="Complete Recovery Validation"]');
  const syncCompleteState = () => {
    if (completeButton) completeButton.disabled = !allConfirmed();
  };
  checkboxes.forEach((checkbox) => checkbox.addEventListener('change', syncCompleteState));
  syncCompleteState();
}

exports.render = render;
exports._test = { appendText, bip39Message, appendOptionalBip39Check, documentationReminder };
