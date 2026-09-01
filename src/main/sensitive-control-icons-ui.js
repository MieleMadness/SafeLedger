'use strict';

const eyeIcon = require('./eye-icon');

function qrIconMarkup() {
  const icon = document.createElement('span');
  icon.className = 'sl-qr-icon';
  icon.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 4; i++) {
    const part = document.createElement('span');
    part.className = `sl-qr-icon-part sl-qr-icon-part-${i + 1}`;
    icon.appendChild(part);
  }
  return icon;
}

function patchSensitiveSummary(summary) {
  if (!summary) return;
  const details = summary.closest('details');
  const label = summary.querySelector('.secure-field-summary-label');
  if (!details || !label) return;

  let icon = label.querySelector('.sl-sensitive-eye');
  const legacy = label.querySelector('.fa');
  if (!icon) {
    icon = document.createElement('span');
    icon.className = 'sl-sensitive-eye';
    icon.setAttribute('aria-hidden', 'true');
    if (legacy) legacy.replaceWith(icon);
    else label.insertBefore(icon, label.firstChild);
  }
  icon.innerHTML = eyeIcon.markup(details.open);

  const action = details.open ? 'Hide sensitive information' : 'Reveal sensitive information';
  summary.title = action;
  summary.setAttribute('aria-label', action);
}

function patchQrButton(button) {
  if (!button || button.querySelector('.sl-qr-icon')) return;
  const crowded = button.querySelector('.fa-qrcode');
  if (!crowded) return;
  crowded.replaceWith(qrIconMarkup());
}

function patch(root = document) {
  for (const summary of root.querySelectorAll('.secure-field-summary')) patchSensitiveSummary(summary);
  for (const button of root.querySelectorAll('.qr-inline-button')) patchQrButton(button);
}

function start() {
  patch();
  const area = document.getElementById('detailArea');
  if (!area || typeof MutationObserver !== 'function') return;
  const observer = new MutationObserver(() => patch(area));
  observer.observe(area, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'open']
  });
}

window.addEventListener('DOMContentLoaded', start);

exports._test = { qrIconMarkup, patchSensitiveSummary, patchQrButton, patch };
