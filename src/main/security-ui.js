'use strict';

const { clipboard } = require('./renderer-bridge');
const QRCode = require('qrcode');
const eyeIcon = require('./eye-icon');

const CLIPBOARD_CLEAR_MS = 30000;
let privacyMode = true;

exports.setPrivacyMode = (enabled) => { privacyMode = enabled !== false; };
exports.isPrivacyMode = () => privacyMode;

function autoClearClipboard(expected) {
  setTimeout(() => {
    try {
      if (clipboard.readText() === expected) clipboard.clear();
    } catch (_) {}
  }, CLIPBOARD_CLEAR_MS);
}

exports.copySensitive = (value) => {
  const text = String(value || '');
  if (!text) return;
  clipboard.writeText(text);
  autoClearClipboard(text);
};

function copyIconMarkup() {
  return '<svg class="sl-copy-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="sl-copy-arrow" d="M18.4 8.4A7.2 7.2 0 0 0 6.2 5.8L4.3 7.7"/><path class="sl-copy-arrow" d="M4.3 7.7V3.7H.8"/><path class="sl-copy-arrow" d="M5.6 15.6a7.2 7.2 0 0 0 12.2 2.6l1.9-1.9"/><path class="sl-copy-arrow" d="M19.7 16.3v4h3.5"/><path class="sl-copy-plus" d="M12 8v8M8 12h8"/></svg>';
}

function makeIconButton(icon, onClick, title, extraClass = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn btn-default btn-sm field-inline-action ${extraClass}`.trim();
  button.title = title;
  button.setAttribute('aria-label', title);
  button.innerHTML = `<i class="fa ${icon}"></i>`;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick(event, button);
  });
  return button;
}

function makeCopyButton(copyHandler) {
  const button = makeIconButton('', copyHandler, 'Copy', 'copy-inline-button');
  button.innerHTML = copyIconMarkup();
  return button;
}

async function renderQr(area, value, captionText) {
  area.innerHTML = '';
  const text = String(value || '');
  if (!text) {
    area.style.display = 'none';
    return false;
  }
  try {
    const dataUrl = await QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 2, width: 240 });
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'SafeLedger QR code';
    img.className = 'address-qr';
    area.appendChild(img);
    const caption = document.createElement('div');
    caption.className = 'qr-caption';
    caption.textContent = captionText;
    area.appendChild(caption);
    area.style.display = 'block';
    return true;
  } catch (_) {
    area.textContent = 'Unable to generate QR code.';
    area.style.display = 'block';
    return false;
  }
}

function makeQrButton(valueGetter, qrArea, captionText, onOpen) {
  return makeIconButton('fa-qrcode', async (_event, button) => {
    if (qrArea.style.display !== 'none') {
      qrArea.style.display = 'none';
      button.classList.remove('active');
      return;
    }
    if (onOpen) onOpen();
    const shown = await renderQr(qrArea, valueGetter(), captionText);
    button.classList.toggle('active', shown);
  }, 'Show QR code', 'qr-inline-button');
}

function makeInlineActions(copyHandler, qrValueGetter, qrArea, qrCaption, onQrOpen, allowQr = true) {
  const actions = document.createElement('div');
  actions.className = 'field-inline-actions';
  actions.appendChild(makeCopyButton(copyHandler));
  if (allowQr) actions.appendChild(makeQrButton(qrValueGetter, qrArea, qrCaption, onQrOpen));
  return actions;
}

function makeEditRevealButton(input, label) {
  const actions = document.createElement('div');
  actions.className = 'field-inline-actions edit-sensitive-actions';
  const button = makeIconButton('', (_event, control) => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    const title = `${hidden ? 'Hide' : 'Show'} ${label}`;
    control.title = title;
    control.setAttribute('aria-label', title);
    control.innerHTML = eyeIcon.markup(hidden);
  }, `Show ${label}`, 'edit-sensitive-toggle');
  button.innerHTML = eyeIcon.markup(false);
  actions.appendChild(button);
  return actions;
}

exports.addEditSensitiveInputControl = (input, parent, label) => {
  input.type = 'password';
  input.setAttribute('autocomplete', 'off');
  const shell = document.createElement('div');
  shell.className = 'secure-input-shell edit-sensitive-shell';
  parent.appendChild(shell);
  shell.appendChild(input);
  shell.appendChild(makeEditRevealButton(input, label));
  return shell;
};

exports.appendSensitiveField = (parent, label, value, options = {}) => {
  const allowQr = options.allowQr !== false;
  const wrapper = document.createElement('div');
  wrapper.className = 'sensitive-field';
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.className = 'secure-field-summary';

  const summaryLabel = document.createElement('span');
  summaryLabel.className = 'secure-field-summary-label';
  const stateIcon = document.createElement('i');
  stateIcon.className = 'fa fa-plus';
  const labelText = document.createElement('span');
  labelText.className = 'secure-field-summary-text';
  labelText.textContent = label;
  summaryLabel.appendChild(stateIcon);
  summaryLabel.appendChild(labelText);
  summary.appendChild(summaryLabel);

  const qrArea = document.createElement('div');
  qrArea.className = 'qr-area compact-qr-area';
  qrArea.style.display = 'none';

  const actions = makeInlineActions(
    () => exports.copySensitive(value),
    () => value,
    qrArea,
    `Generated locally from the ${label}. Treat this QR code as sensitive recovery information.`,
    () => { details.open = true; },
    allowQr
  );
  actions.style.display = privacyMode ? 'none' : '';
  summary.appendChild(actions);
  details.appendChild(summary);

  const content = document.createElement('div');
  content.className = 'sensitive-field-content';
  const out = document.createElement('div');
  out.className = 'outData sensitive-value';
  out.textContent = value || '';
  content.appendChild(out);

  if (options.meta && options.meta.label && options.meta.value) {
    const meta = document.createElement('div');
    meta.className = 'sensitive-field-meta';
    const metaLabel = document.createElement('b');
    metaLabel.textContent = `${options.meta.label}: `;
    meta.appendChild(metaLabel);
    const metaValue = document.createElement('span');
    metaValue.textContent = String(options.meta.value);
    meta.appendChild(metaValue);
    content.appendChild(meta);
  }

  if (allowQr) content.appendChild(qrArea);

  details.addEventListener('toggle', () => {
    stateIcon.className = details.open ? 'fa fa-minus' : 'fa fa-plus';
    if (privacyMode) actions.style.display = details.open ? '' : 'none';
    if (!details.open && qrArea.style.display !== 'none') qrArea.style.display = 'none';
  });
  details.appendChild(content);
  wrapper.appendChild(details);
  parent.appendChild(wrapper);
  return wrapper;
};

exports.appendPublicAddressField = (parent, address, symbol) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'public-address-field';
  const label = document.createElement('b');
  label.textContent = 'Public Address:';
  wrapper.appendChild(label);

  const shell = document.createElement('div');
  shell.className = 'field-display-shell';
  const out = document.createElement('div');
  out.className = 'outData public-address-value';
  out.textContent = address || '';
  shell.appendChild(out);

  const qrArea = document.createElement('div');
  qrArea.className = 'qr-area compact-qr-area';
  qrArea.style.display = 'none';

  if (address) {
    shell.appendChild(makeInlineActions(
      () => clipboard.writeText(String(address)),
      () => address,
      qrArea,
      `Generated locally from the ${symbol || 'asset'} public address. No network connection is used.`
    ));
  }
  wrapper.appendChild(shell);
  wrapper.appendChild(qrArea);
  parent.appendChild(wrapper);
};

exports.appendPublicAddressTools = (parent, address, symbol) => exports.appendPublicAddressField(parent, address, symbol);

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

function createPrintFrame() {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('tabindex', '-1');
  frame.style.position = 'fixed';
  frame.style.width = '1px';
  frame.style.height = '1px';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.border = '0';
  frame.style.opacity = '0';
  document.body.appendChild(frame);
  return frame;
}

exports.printRecoverySheet = (title, fields, includesSensitive) => {
  if (includesSensitive) {
    const approved = confirm('This printout contains sensitive recovery information. Anyone who sees it may gain access to your crypto. Print only to a trusted local printer and store the paper securely. Continue?');
    if (!approved) return;
  }
  const rows = fields.filter((field) => field && field.value).map((field) => `<tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(field.value)}</td></tr>`).join('');
  const frame = createPrintFrame();
  const printWindow = frame.contentWindow;
  const printDocument = frame.contentDocument || (printWindow && printWindow.document);
  if (!printWindow || !printDocument) {
    frame.remove();
    return alert('Unable to prepare print sheet.');
  }
  printDocument.open();
  printDocument.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111}h1{font-size:24px}p.warn{border:2px solid #000;padding:10px;font-weight:bold}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #999;padding:10px;text-align:left;vertical-align:top;word-break:break-all}th{width:180px;background:#eee}</style></head><body><h1>${escapeHtml(title)}</h1>${includesSensitive ? '<p class="warn">CONFIDENTIAL RECOVERY INFORMATION — KEEP SECURE</p>' : ''}<table>${rows}</table><p>Generated offline by SafeLedger on ${escapeHtml(new Date().toString())}</p></body></html>`);
  printDocument.close();
  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } finally {
      setTimeout(() => frame.remove(), 0);
    }
  }, 50);
};

exports._test = { makeIconButton, makeCopyButton, copyIconMarkup, makeEditRevealButton, makeInlineActions, createPrintFrame };
