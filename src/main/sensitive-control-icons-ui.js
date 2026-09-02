'use strict';

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
  const icon = summary.querySelector('.secure-field-summary-label > .fa');
  if (!details || !icon) return;
  icon.className = details.open ? 'fa fa-minus' : 'fa fa-plus';
  const action = details.open ? 'Collapse sensitive information' : 'Expand sensitive information';
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
    subtree: true
  });
}

window.addEventListener('DOMContentLoaded', start);

exports._test = { qrIconMarkup, patchSensitiveSummary, patchQrButton, patch };
