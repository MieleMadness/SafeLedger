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

function filterProfiles() {
  const input = document.getElementById('profileSearch');
  const area = document.getElementById('vaultArea');
  if (!input || !area) return;
  const query = String(input.value || '').trim().toLowerCase();
  area.querySelectorAll('ul.nav > li').forEach((item) => {
    const text = String(item.textContent || '').toLowerCase();
    item.style.display = !query || text.includes(query) ? '' : 'none';
  });
}

function setupProfileSearch() {
  const input = document.getElementById('profileSearch');
  const area = document.getElementById('vaultArea');
  if (!input || !area) return;
  input.addEventListener('input', filterProfiles);
  input.addEventListener('keyup', filterProfiles);
  const observer = new MutationObserver(filterProfiles);
  observer.observe(area, { childList: true, subtree: true });
  filterProfiles();
}

window.addEventListener('DOMContentLoaded', () => {
  setupSearchClear('profileSearch', 'profileSearchClear');
  setupSearchClear('groupSearch', 'groupSearchClear');
  setupSearchClear('recordSearch', 'recordSearchClear');
  setupProfileSearch();
});

exports._test = { filterProfiles };
