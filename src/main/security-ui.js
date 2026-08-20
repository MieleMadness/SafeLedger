'use strict';

const { clipboard } = require('electron');
const QRCode = require('qrcode');

const CLIPBOARD_CLEAR_MS = 30000;

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

function makeCopyIcon(onClick, title='Copy') {
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'btn btn-default btn-sm copy-icon-button';
  copy.title = title;
  copy.setAttribute('aria-label', title);
  copy.innerHTML = '<i class="fa fa-copy"></i>';
  copy.addEventListener('click', onClick);
  return copy;
}

exports.addSensitiveInputControls = (input, parent, label) => {
  input.type = 'password';
  input.setAttribute('autocomplete', 'off');

  const row = document.createElement('div');
  row.className = 'secure-input-row';
  parent.insertBefore(row, input);
  const copy = makeCopyIcon(() => exports.copySensitive(input.value), `Copy ${label}`);
  row.appendChild(copy);
  row.appendChild(input);

  const controls = document.createElement('div');
  controls.className = 'sensitive-controls';
  const reveal = document.createElement('button');
  reveal.type = 'button';
  reveal.className = 'btn btn-default btn-sm';
  reveal.innerHTML = `<i class="fa fa-eye"></i> Show ${label}`;
  reveal.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    reveal.innerHTML = isHidden
      ? `<i class="fa fa-eye-slash"></i> Hide ${label}`
      : `<i class="fa fa-eye"></i> Show ${label}`;
  });
  controls.appendChild(reveal);
  parent.appendChild(controls);
};

exports.appendSensitiveField = (parent, label, value) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'sensitive-field';
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.innerHTML = `<i class="fa fa-plus-circle"></i> ${label}`;
  details.appendChild(summary);

  const content = document.createElement('div');
  content.className = 'sensitive-field-content';
  const row = document.createElement('div');
  row.className = 'field-value-row';
  if (value) row.appendChild(makeCopyIcon(() => exports.copySensitive(value), `Copy ${label}`));
  const out = document.createElement('div');
  out.className = 'outData sensitive-value';
  out.textContent = value || '';
  row.appendChild(out);
  content.appendChild(row);

  details.addEventListener('toggle', () => {
    summary.innerHTML = details.open
      ? `<i class="fa fa-minus-circle"></i> Hide ${label}`
      : `<i class="fa fa-plus-circle"></i> ${label}`;
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

  const row = document.createElement('div');
  row.className = 'field-value-row';
  if (address) row.appendChild(makeCopyIcon(() => clipboard.writeText(String(address)), 'Copy public address'));
  const out = document.createElement('div');
  out.className = 'outData public-address-value';
  out.textContent = address || '';
  row.appendChild(out);
  wrapper.appendChild(row);

  if (address) {
    const qrButton = document.createElement('button');
    qrButton.type = 'button';
    qrButton.className = 'btn btn-default btn-sm qr-toggle-button';
    qrButton.innerHTML = '<i class="fa fa-qrcode"></i> Show QR';
    wrapper.appendChild(qrButton);
    const qrArea = document.createElement('div');
    qrArea.className = 'qr-area';
    qrArea.style.display = 'none';
    wrapper.appendChild(qrArea);
    qrButton.addEventListener('click', async () => {
      if (qrArea.style.display !== 'none') {
        qrArea.style.display = 'none';
        qrButton.innerHTML = '<i class="fa fa-qrcode"></i> Show QR';
        return;
      }
      qrArea.innerHTML = '';
      try {
        const dataUrl = await QRCode.toDataURL(String(address), { errorCorrectionLevel: 'M', margin: 2, width: 240 });
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = `${symbol || ''} public address QR code`.trim();
        img.className = 'address-qr';
        qrArea.appendChild(img);
        const caption = document.createElement('div');
        caption.className = 'qr-caption';
        caption.textContent = 'Generated locally from the public address. No network connection is used.';
        qrArea.appendChild(caption);
        qrArea.style.display = 'block';
        qrButton.innerHTML = '<i class="fa fa-eye-slash"></i> Hide QR';
      } catch (_) {
        qrArea.textContent = 'Unable to generate QR code.';
        qrArea.style.display = 'block';
      }
    });
  }
  parent.appendChild(wrapper);
};

exports.appendPublicAddressTools = (parent, address, symbol) => exports.appendPublicAddressField(parent, address, symbol);

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

exports.printRecoverySheet = (title, fields, includesSensitive) => {
  if (includesSensitive) {
    const approved = confirm('This printout contains sensitive recovery information. Anyone who sees it may gain access to your crypto. Print only to a trusted local printer and store the paper securely. Continue?');
    if (!approved) return;
  }
  const rows = fields.filter((field) => field && field.value).map((field) => `<tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(field.value)}</td></tr>`).join('');
  const popup = window.open('', '_blank', 'width=760,height=800');
  if (!popup) return alert('Unable to open print window.');
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111}h1{font-size:24px}p.warn{border:2px solid #000;padding:10px;font-weight:bold}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #999;padding:10px;text-align:left;vertical-align:top;word-break:break-all}th{width:180px;background:#eee}@media print{button{display:none}}</style></head><body><h1>${escapeHtml(title)}</h1>${includesSensitive ? '<p class="warn">CONFIDENTIAL RECOVERY INFORMATION — KEEP SECURE</p>' : ''}<table>${rows}</table><p>Generated offline by SafeLedger on ${escapeHtml(new Date().toString())}</p><button onclick="window.print()">Print</button></body></html>`);
  popup.document.close();
};
