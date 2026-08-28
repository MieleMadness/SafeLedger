'use strict';

function setupSearchClear(inputId, buttonId) {
  const input = document.getElementById(inputId);
  const button = document.getElementById(buttonId);
  if (!input || !button) return;

  const refresh = () => {
    button.style.visibility = input.value ? 'visible' : 'hidden';
  };

  input.addEventListener('input', refresh);
  button.addEventListener('click', () => {
    input.value = '';
    refresh();
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }));
  });

  refresh();
}

window.addEventListener('DOMContentLoaded', () => {
  setupSearchClear('profileSearch', 'profileSearchClear');
  setupSearchClear('groupSearch', 'groupSearchClear');
  setupSearchClear('recordSearch', 'recordSearchClear');
});

exports._test = { setupSearchClear };
