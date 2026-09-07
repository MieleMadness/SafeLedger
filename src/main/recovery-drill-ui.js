'use strict';

const detailActions = require('./detail-actions');
const recoveryDrill = require('./recovery-drill');
const bip39 = require('./bip39-validator');
const motion = require('./motion-ui');

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
  appendText(section, 'p', 'recovery-drill-intro', 'If this vault item uses a BIP39 seed phrase, you may validate its word list and checksum locally. SafeLedger does not save, log, copy, or transmit what you enter here.');
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
    if (!temporaryMnemonic.trim()) { resultText.textContent = 'Enter a mnemonic to run the optional local check.'; return; }
    const result = bip39.validateMnemonic(temporaryMnemonic);
    input.value = '';
    resultText.textContent = bip39Message(result);
    resultText.className = `recovery-drill-validation-result ${result.valid ? 'is-ready' : 'is-review'}`;
    motion.reveal(resultText);
  });
  area.appendChild(section);
}

function documentationReminder(group = {}) {
  if (recoveryDrill.canComplete(group)) return '';
  if (group.lastRecoveryDrill || group.lastVerified) return 'Documentation reminder: this Recovery Validation may be current, but SafeLedger still does not have a recovery method, recovery location, or recovery instructions documented for this vault item. Completing or verifying a drill records that you tested the process; it does not create the missing recovery documentation. Recovery Readiness will remain incomplete until at least one part of the recovery plan is documented from Edit Vault Item.';
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

  const privacy = document.createElement('div');
  privacy.className = 'recovery-drill-privacy';
  const privacyIcon = document.createElement('i');
  privacyIcon.className = 'fa fa-lock';
  privacyIcon.setAttribute('aria-hidden', 'true');
  privacy.appendChild(privacyIcon);
  appendText(privacy, 'div', '', 'This guided test does not require you to reveal recovery phrases, private keys, passwords, PINs, or sensitive custom-field values. Confirm the checklist using your real-world recovery plan.');
  area.appendChild(privacy);

  const reminder = documentationReminder(group);
  if (reminder) appendText(area, 'div', 'recovery-drill-warning', reminder);

  const steps = recoveryDrill.buildSteps(group);
  const wizard = document.createElement('section');
  wizard.className = 'recovery-drill-wizard';
  const progressHead = document.createElement('div');
  progressHead.className = 'recovery-drill-progress-head';
  const progressLabel = appendText(progressHead, 'strong', 'recovery-drill-progress-label', 'Step 1');
  const progressPercent = appendText(progressHead, 'span', 'recovery-drill-progress-percent', '0% confirmed');
  wizard.appendChild(progressHead);
  const track = document.createElement('div');
  track.className = 'recovery-drill-progress-track';
  const fill = document.createElement('span');
  fill.className = 'recovery-drill-progress-fill';
  track.appendChild(fill);
  wizard.appendChild(track);
  appendText(wizard, 'p', 'recovery-drill-intro', 'Work through one recovery check at a time. Confirm a step only after you have physically or operationally verified it.');

  const list = document.createElement('div');
  list.className = 'recovery-drill-list recovery-drill-wizard-list';
  const checkboxes = [];
  const rows = [];
  steps.forEach((step, index) => {
    const row = document.createElement('label');
    row.className = 'recovery-drill-step recovery-drill-wizard-step';
    row.dataset.stepIndex = String(index);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', step.title);
    checkboxes.push(checkbox);
    row.appendChild(checkbox);
    const body = document.createElement('span');
    body.className = 'recovery-drill-step-body';
    appendText(body, 'span', 'recovery-drill-step-number', `Step ${index + 1} of ${steps.length}`);
    appendText(body, 'strong', 'recovery-drill-step-title', step.title);
    appendText(body, 'span', 'recovery-drill-step-text', step.text);
    row.appendChild(body);
    list.appendChild(row);
    rows.push(row);
  });
  wizard.appendChild(list);

  const controls = document.createElement('div');
  controls.className = 'recovery-drill-wizard-controls';
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'btn btn-default';
  previous.innerHTML = '<i class="fa fa-chevron-left" aria-hidden="true"></i> Previous';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'btn btn-default';
  next.innerHTML = 'Next <i class="fa fa-chevron-right" aria-hidden="true"></i>';
  controls.appendChild(previous);
  controls.appendChild(next);
  wizard.appendChild(controls);
  area.appendChild(wizard);

  let activeIndex = 0;
  const allConfirmed = () => checkboxes.length > 0 && checkboxes.every((checkbox) => checkbox.checked);
  const confirmedCount = () => checkboxes.filter((checkbox) => checkbox.checked).length;
  const syncWizard = (animateStep = false) => {
    rows.forEach((row, index) => { row.hidden = index !== activeIndex; row.classList.toggle('is-active', index === activeIndex); });
    progressLabel.textContent = `Step ${Math.min(activeIndex + 1, steps.length)} of ${steps.length}`;
    const confirmed = confirmedCount();
    const percent = steps.length ? Math.round((confirmed / steps.length) * 100) : 0;
    progressPercent.textContent = `${percent}% confirmed`;
    fill.style.width = `${percent}%`;
    previous.disabled = activeIndex === 0;
    next.disabled = activeIndex >= steps.length - 1;
    if (animateStep && rows[activeIndex]) motion.reveal(rows[activeIndex]);
    const dock = document.getElementById('detailActionArea');
    const completeButton = dock && dock.querySelector('[aria-label="Complete Recovery Validation"]');
    if (completeButton) completeButton.disabled = !allConfirmed();
  };
  previous.addEventListener('click', () => { if (activeIndex > 0) { activeIndex--; syncWizard(true); } });
  next.addEventListener('click', () => { if (activeIndex < rows.length - 1) { activeIndex++; syncWizard(true); } });
  checkboxes.forEach((checkbox, index) => checkbox.addEventListener('change', () => {
    syncWizard(false);
    if (checkbox.checked && index === activeIndex && activeIndex < rows.length - 1) { activeIndex++; syncWizard(true); }
  }));

  const storageNote = document.createElement('div');
  storageNote.className = 'recovery-drill-storage-note';
  appendText(storageNote, 'strong', '', 'What SafeLedger records: ');
  storageNote.appendChild(document.createTextNode('only the successful Recovery Validation completion time and refreshed Last Verified time. Individual checklist answers are not stored.'));
  area.appendChild(storageNote);

  appendOptionalBip39Check(area);

  const complete = (_event, button) => {
    if (!allConfirmed()) return alert('Confirm every Recovery Validation step before marking the validation complete.');
    if (button) button.disabled = true;
    if (typeof params.onComplete === 'function') params.onComplete(recoveryDrill.completionPatch(), button);
  };
  detailActions.set([
    { icon: 'fa-times', title: 'Cancel Recovery Validation', className: 'detail-action-cancel', onClick: () => { if (typeof params.onCancel === 'function') params.onCancel(); } },
    { icon: 'fa-check-circle', title: 'Complete Recovery Validation', className: 'recovery-drill-complete-action', onClick: complete }
  ]);
  detailActions.setDetailMode('view');
  syncWizard(false);
}

exports.render = render;
exports._test = { appendText, bip39Message, appendOptionalBip39Check, documentationReminder };