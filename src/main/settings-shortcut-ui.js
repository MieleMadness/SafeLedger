'use strict';

window.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('settingsButton');
  if (!button) return;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    if (!window.safeLedgerApi || typeof window.safeLedgerApi.requestSettings !== 'function') return;
    window.safeLedgerApi.requestSettings();
  });
});
