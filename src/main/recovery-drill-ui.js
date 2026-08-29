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
    'If this wallet uses a BIP39 seed phrase, you may validate its word list and checksum locally. SafeLedger does not save, log, copy, or transmit what you enter here.'
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
  actions.className = 'settings-section-actions';
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

function render(params = {}) {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const group = params.group || {};
  area.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'recovery-drill-header';
  appendText(header, 'h1', '', 'Test Recovery');
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
    'This guided test does not require you to reveal recovery phrases, private keys, passwords, PINs, or sensitive custom-field values. Confirm the checklist using your real-world recovery plan. The optional BIP39 checker is local-only and clears its input immediately after validation.'
  );
  area.appendChild(privacy);

  const eligible = recoveryDrill.canComplete(group);
  if (!eligible) {
    appendText(
      area,
      'div',
      'recovery-drill-warning',
      'A recovery method is not documented yet. You can review the checklist, but SafeLedger will not mark Test Recovery complete until recovery information or a recovery-material location is documented for this wallet.'
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

  appendOptionalBip39Check(area);

  const storageNote = document.createElement('div');
  storageNote.className = 'recovery-drill-storage-note';
  appendText(storageNote, 'strong', '', 'What SafeLedger records: ');
  storageNote.appendChild(document.createTextNode('only the successful Test Recovery completion time and the refreshed Last Verified time. Checklist answers and optional BIP39 input/results are not stored.'));
  area.appendChild(storageNote);

  const allConfirmed = () => checkboxes.length > 0 && checkboxes.every((checkbox) => checkbox.checked);
  const complete = (_event, button) => {
    if (!eligible) return alert('Document a recovery method or recovery-material location before completing Test Recovery.');
    if (!allConfirmed()) return alert('Confirm every Test Recovery step before marking the test complete.');
    if (button) button.disabled = true;
    if (typeof params.onComplete === 'function') params.onComplete(recoveryDrill.completionPatch(), button);
  };

  detailActions.set([
    {
      icon: 'fa-times',
      title: 'Cancel Test Recovery',
      className: 'detail-action-cancel',
      onClick: () => { if (typeof params.onCancel === 'function') params.onCancel(); }
    },
    {
      icon: 'fa-check-circle',
      title: 'Complete Test Recovery',
      className: 'recovery-drill-complete-action',
      onClick: complete
    }
  ]);
  detailActions.setDetailMode('view');

  const dock = document.getElementById('detailActionArea');
  const completeButton = dock && dock.querySelector('[aria-label="Complete Test Recovery"]');
  const syncCompleteState = () => {
    if (completeButton) completeButton.disabled = !eligible || !allConfirmed();
  };
  checkboxes.forEach((checkbox) => checkbox.addEventListener('change', syncCompleteState));
  syncCompleteState();
}

exports.render = render;
exports._test = { appendText, bip39Message, appendOptionalBip39Check };
