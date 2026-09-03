'use strict';

const QRCode = require('qrcode');
const detailActions = require('./detail-actions');
const recoveryBinder = require('./recovery-binder');

const OPTION_DEFINITIONS = Object.freeze([
  ['includePublicAddresses', 'Include public addresses', 'Useful for identification, but public addresses can reveal wallet activity when shared.'],
  ['includeBalances', 'Include balances', 'Manual balances are financial information and are excluded by default.'],
  ['includeNotes', 'Include notes', 'Notes may contain information you did not intend to print. Review them before enabling this option.'],
  ['includePasswordsPins', 'Include passwords, PINs, and recovery links', 'Anyone with the printout may gain access to protected wallet functions.'],
  ['includeSeedPrivateKeys', 'Include seed phrases and private keys', 'Highest risk. Anyone with this printout may be able to control funds.'],
  ['includeSensitiveCustomFields', 'Include sensitive custom fields', 'Includes custom fields you explicitly marked Sensitive.'],
  ['includeQrCodes', 'Print available QR codes', 'Adds QR images only beside fields that already have a QR action in SafeLedger. A QR code never adds a field you did not already choose to print.']
]);

function ensureStyles() {
  if (document.getElementById('recoveryBinderStyles')) return;
  const link = document.createElement('link');
  link.id = 'recoveryBinderStyles';
  link.rel = 'stylesheet';
  link.href = 'css/recovery-binder.css';
  document.head.appendChild(link);
}

function appendText(parent, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  parent.appendChild(node);
  return node;
}

function makeOption(key, title, description) {
  const label = document.createElement('label');
  label.className = 'recovery-binder-option';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.dataset.option = key;
  label.appendChild(checkbox);
  const body = document.createElement('span');
  body.className = 'recovery-binder-option-body';
  appendText(body, 'strong', 'recovery-binder-option-title', title);
  appendText(body, 'span', 'recovery-binder-option-text', description);
  label.appendChild(body);
  return { label, checkbox };
}

function collectOptions(checkboxes) {
  const options = {};
  for (const checkbox of checkboxes) options[checkbox.dataset.option] = checkbox.checked === true;
  return recoveryBinder.normalizeOptions(options);
}

function addPrintStyles(doc) {
  const style = doc.createElement('style');
  style.textContent = `
    body{font-family:Arial,sans-serif;margin:0;padding:28px;color:#172033;font-size:13px;line-height:1.45}
    h1{font-size:26px;margin:0 0 6px}h2{font-size:20px;margin:26px 0 10px;padding-bottom:5px;border-bottom:2px solid #253047}
    h3{font-size:16px;margin:18px 0 8px}.meta{color:#596579;margin-bottom:18px}
    .warning{border:2px solid #9d2a22;background:#fff1f0;color:#7a1f1a;padding:10px 12px;font-weight:bold;margin:14px 0}
    .safe-note{border-left:4px solid #0D47A1;background:#eef5ff;padding:10px 12px;margin:14px 0;color:#274766}
    table{width:100%;border-collapse:collapse;margin:8px 0 12px}th,td{border:1px solid #c7ced8;padding:7px 8px;text-align:left;vertical-align:top;word-break:break-word}
    th{width:190px;background:#f3f5f8}.asset{margin:12px 0 16px;padding-left:12px;border-left:3px solid #d8dee8}
    .qr-print-wrap{margin-top:9px;display:flex;align-items:flex-start;gap:8px}.qr-print{width:118px;height:118px;padding:4px;background:#fff;border:1px solid #c7ced8;object-fit:contain}
    .qr-print-label{max-width:180px;color:#596579;font-size:11px;line-height:1.35}
    .empty{color:#667085;font-style:italic}.print-actions{margin-top:20px}.print-actions button{padding:8px 14px}
    @media print{.print-actions{display:none}body{padding:0}.wallet-section{break-inside:avoid-page}.qr-print-wrap{break-inside:avoid}}
  `;
  doc.head.appendChild(style);
}

async function appendQr(doc, parent, field) {
  if (!field || field.qr !== true || !String(field.value || '').trim()) return;
  try {
    const dataUrl = await QRCode.toDataURL(String(field.value), {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 180
    });
    const wrap = doc.createElement('div');
    wrap.className = 'qr-print-wrap';
    const image = doc.createElement('img');
    image.className = 'qr-print';
    image.src = dataUrl;
    image.alt = `${field.label} QR code`;
    wrap.appendChild(image);
    const label = doc.createElement('div');
    label.className = 'qr-print-label';
    label.textContent = `QR code for ${field.label}. It contains the same value printed above.`;
    wrap.appendChild(label);
    parent.appendChild(wrap);
  } catch (_) {
    // The text value is still printed even if QR generation is unavailable.
  }
}

async function appendTable(doc, parent, fields) {
  const rows = Array.isArray(fields) ? fields.filter((field) => field && String(field.value || '').trim()) : [];
  if (!rows.length) {
    appendText(parent, 'p', 'empty', 'No information recorded.');
    return;
  }
  const table = doc.createElement('table');
  const tbody = doc.createElement('tbody');
  for (const field of rows) {
    const tr = doc.createElement('tr');
    const th = doc.createElement('th');
    th.textContent = field.label;
    const td = doc.createElement('td');
    td.textContent = String(field.value);
    await appendQr(doc, td, field);
    tr.appendChild(th);
    tr.appendChild(td);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  parent.appendChild(table);
}

async function printBinder(binder) {
  const popup = window.open('', '_blank', 'width=900,height=900');
  if (!popup) return alert('Unable to open print window.');

  const doc = popup.document;
  doc.title = binder.title;
  doc.head.innerHTML = '';
  doc.body.innerHTML = '';
  const meta = doc.createElement('meta');
  meta.setAttribute('charset', 'utf-8');
  doc.head.appendChild(meta);
  addPrintStyles(doc);

  appendText(doc.body, 'h1', '', binder.title);
  appendText(doc.body, 'div', 'meta', `Generated offline by SafeLedger on ${new Date(binder.generatedAt).toString()}.`);

  if (binder.privacySelections.length) {
    appendText(
      doc.body,
      'div',
      'warning',
      `CONFIDENTIAL RECOVERY INFORMATION — This binder includes: ${binder.privacySelections.join(', ')}. Store and handle the printout securely.`
    );
  } else {
    appendText(
      doc.body,
      'div',
      'safe-note',
      'Safe-default binder: passwords, PINs, recovery links, seed phrases, private keys, balances, notes, public addresses, and sensitive custom fields were not included.'
    );
  }

  appendText(doc.body, 'h2', '', 'Profile');
  await appendTable(doc, doc.body, binder.profileFields);
  appendText(doc.body, 'div', 'meta', `${binder.walletCount} vault item${binder.walletCount === 1 ? '' : 's'} · ${binder.assetCount} asset${binder.assetCount === 1 ? '' : 's'}`);

  for (const wallet of binder.wallets) {
    const walletSection = doc.createElement('section');
    walletSection.className = 'wallet-section';
    appendText(walletSection, 'h2', '', wallet.title);
    await appendTable(doc, walletSection, wallet.fields);

    if (wallet.assets.length) {
      appendText(walletSection, 'h3', '', 'Assets');
      for (const asset of wallet.assets) {
        const assetSection = doc.createElement('section');
        assetSection.className = 'asset';
        appendText(assetSection, 'h3', '', asset.title);
        await appendTable(doc, assetSection, asset.fields);
        walletSection.appendChild(assetSection);
      }
    }
    doc.body.appendChild(walletSection);
  }

  const actions = doc.createElement('div');
  actions.className = 'print-actions';
  const printButton = doc.createElement('button');
  printButton.type = 'button';
  printButton.textContent = 'Print Recovery Binder';
  printButton.addEventListener('click', () => popup.print());
  actions.appendChild(printButton);
  doc.body.appendChild(actions);
}

async function fetchBinder(profile, options, recordActivity = false) {
  if (!window.safeLedgerApi || typeof window.safeLedgerApi.getRecoveryBinder !== 'function') throw new Error('SafeLedger Recovery Binder bridge is unavailable.');
  const result = await window.safeLedgerApi.getRecoveryBinder(profile.file, options, recordActivity === true);
  if (!result || result.ok !== true || !result.binder) throw new Error(result && result.message ? result.message : 'Unable to prepare the Recovery Binder.');
  return result.binder;
}

async function show(params = {}) {
  ensureStyles();
  const area = document.getElementById('detailArea');
  if (!area || !params.profile || !params.profile.file) return;
  area.innerHTML = '';
  appendText(area, 'h1', '', 'Recovery Binder');
  appendText(
    area,
    'p',
    'recovery-binder-intro',
    `Build a printable offline recovery package for ${params.profile.name || 'this profile'}. Safe defaults include recovery planning information and asset names, but exclude high-risk secrets and financial details.`
  );

  const notice = document.createElement('div');
  notice.className = 'recovery-binder-safe-defaults';
  const icon = document.createElement('i');
  icon.className = 'fa fa-shield';
  icon.setAttribute('aria-hidden', 'true');
  notice.appendChild(icon);
  appendText(
    notice,
    'div',
    '',
    'Recovery locations and recovery instructions are included by default. Do not place seed phrases or private keys in those planning fields if you do not want them printed.'
  );
  area.appendChild(notice);

  const summary = document.createElement('div');
  summary.className = 'recovery-binder-summary';
  appendText(summary, 'span', 'recovery-binder-loading', 'Reading the selected encrypted profile…');
  area.appendChild(summary);

  try {
    const safeBinder = await fetchBinder(params.profile, recoveryBinder.DEFAULT_OPTIONS, false);
    summary.innerHTML = '';
    appendText(summary, 'strong', '', `${safeBinder.walletCount} vault item${safeBinder.walletCount === 1 ? '' : 's'}`);
    appendText(summary, 'span', '', `${safeBinder.assetCount} asset${safeBinder.assetCount === 1 ? '' : 's'}`);
  } catch (err) {
    summary.textContent = err && err.message ? err.message : 'Unable to read the selected profile.';
  }

  appendText(area, 'h2', 'product-section-title', 'Optional information');
  const optionHost = document.createElement('div');
  optionHost.className = 'recovery-binder-options';
  const checkboxes = [];
  for (const definition of OPTION_DEFINITIONS) {
    const option = makeOption(...definition);
    optionHost.appendChild(option.label);
    checkboxes.push(option.checkbox);
  }
  area.appendChild(optionHost);

  const risk = document.createElement('div');
  risk.className = 'recovery-binder-risk';
  risk.textContent = 'Nothing in this list is included unless you check it. QR codes only mirror values from fields you already chose to print.';
  area.appendChild(risk);

  const print = async (_event, button) => {
    const options = collectOptions(checkboxes);
    const privacySelections = recoveryBinder.selectedPrivacyLabels(options);
    if (privacySelections.length) {
      const approved = confirm(
        `This Recovery Binder will include additional private or sensitive information: ${privacySelections.join(', ')}. Anyone who sees the printout may learn vault-item details or gain access to funds. Print only to a trusted local printer and store it securely. Continue?`
      );
      if (!approved) return;
    }
    if (button) button.disabled = true;
    try {
      const binder = await fetchBinder(params.profile, options, true);
      await printBinder(binder);
    } catch (err) {
      alert(err && err.message ? err.message : 'Unable to prepare the Recovery Binder.');
    } finally {
      if (button) button.disabled = false;
    }
  };

  detailActions.set([
    { icon: 'fa-times', title: 'Cancel recovery binder', className: 'detail-action-cancel', onClick: () => { if (typeof params.onCancel === 'function') params.onCancel(); } },
    { icon: 'fa-print', title: 'Print recovery binder', className: 'detail-action-print', onClick: print }
  ]);
  detailActions.setDetailMode('view');
}

exports.show = show;
exports._test = { OPTION_DEFINITIONS, ensureStyles, collectOptions, appendQr, appendTable, printBinder, fetchBinder };