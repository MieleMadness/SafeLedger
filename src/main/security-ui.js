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

exports.addSensitiveInputControls = (input, parent, label) => {
  input.type = 'password';
  input.setAttribute('autocomplete', 'off');

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

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'btn btn-default btn-sm';
  copy.innerHTML = '<i class="fa fa-copy"></i> Copy';
  copy.addEventListener('click', () => exports.copySensitive(input.value));
  controls.appendChild(copy);
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
  const out = document.createElement('div');
  out.className = 'outData sensitive-value';
  out.textContent = value || '';
  content.appendChild(out);

  if (value) {
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn btn-default btn-sm';
    copy.innerHTML = '<i class="fa fa-copy"></i> Copy';
    copy.addEventListener('click', () => exports.copySensitive(value));
    content.appendChild(copy);
  }

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

exports.appendPublicAddressTools = (parent, address, symbol) => {
  if (!address) return;
  const controls = document.createElement('div');
  controls.className = 'public-address-controls';

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'btn btn-default btn-sm';
  copy.innerHTML = '<i class="fa fa-copy"></i> Copy address';
  copy.addEventListener('click', () => {
    clipboard.writeText(String(address));
  });
  controls.appendChild(copy);

  const qrButton = document.createElement('button');
  qrButton.type = 'button';
  qrButton.className = 'btn btn-default btn-sm';
  qrButton.innerHTML = '<i class="fa fa-qrcode"></i> Show QR';
  controls.appendChild(qrButton);

  const qrArea = document.createElement('div');
  qrArea.className = 'qr-area';
  qrArea.style.display = 'none';
  controls.appendChild(qrArea);

  qrButton.addEventListener('click', async () => {
    if (qrArea.style.display !== 'none') {
      qrArea.style.display = 'none';
      qrButton.innerHTML = '<i class="fa fa-qrcode"></i> Show QR';
      return;
    }
    qrArea.innerHTML = '';
    try {
      const dataUrl = await QRCode.toDataURL(String(address), {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 240
      });
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

  parent.appendChild(controls);
};
