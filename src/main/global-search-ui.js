'use strict';

let configured = false;
let params = {};
let overlay = null;
let requestToken = 0;

function appendText(parent, tagName, className, value) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  node.textContent = value;
  parent.appendChild(node);
  return node;
}

function close() {
  requestToken++;
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  overlay = null;
}

function resultIcon(type) {
  return type === 'profile' ? 'fa-folder-o' : type === 'wallet' ? 'fa-credit-card' : 'fa-circle-o';
}

function renderResults(host, results, query) {
  host.innerHTML = '';
  if (!results.length) {
    const empty = document.createElement('div');
    empty.className = 'global-search-empty';
    appendText(empty, 'i', 'fa fa-search', '');
    appendText(empty, 'strong', '', query.length < 2 ? 'Type at least 2 characters' : 'No matching items');
    appendText(empty, 'span', '', 'Global Search excludes secret and recovery-detail values.');
    host.appendChild(empty);
    return;
  }

  results.forEach((result) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'global-search-result';
    const icon = document.createElement('span');
    icon.className = 'global-search-result-icon';
    const iconNode = document.createElement('i');
    iconNode.className = `fa ${resultIcon(result.type)}`;
    iconNode.setAttribute('aria-hidden', 'true');
    icon.appendChild(iconNode);
    button.appendChild(icon);

    const body = document.createElement('span');
    body.className = 'global-search-result-body';
    const titleRow = document.createElement('span');
    titleRow.className = 'global-search-result-title';
    if (result.pinned) {
      const pin = document.createElement('i');
      pin.className = 'fa fa-star global-search-result-star';
      pin.setAttribute('aria-label', 'Pinned');
      titleRow.appendChild(pin);
    }
    titleRow.appendChild(document.createTextNode(result.title || 'Item'));
    body.appendChild(titleRow);
    appendText(body, 'span', 'global-search-result-meta', result.subtitle || result.type || '');
    button.appendChild(body);

    const kind = appendText(button, 'span', 'global-search-result-kind', String(result.type || '').toUpperCase());
    kind.setAttribute('aria-hidden', 'true');
    button.addEventListener('click', () => {
      close();
      if (typeof params.onSelect === 'function') params.onSelect(result);
    });
    host.appendChild(button);
  });
}

async function runSearch(input, host) {
  const query = String(input.value || '').trim();
  const token = ++requestToken;
  if (query.length < 2) return renderResults(host, [], query);
  host.innerHTML = '<div class="global-search-loading"><i class="fa fa-refresh fa-spin"></i> Searching encrypted vaults locally…</div>';
  try {
    const response = await window.safeLedgerApi.globalSearch(query);
    if (token !== requestToken || !overlay) return;
    if (!response || response.ok !== true) throw new Error(response && response.message || 'Search unavailable.');
    renderResults(host, Array.isArray(response.results) ? response.results : [], query);
  } catch (err) {
    if (token !== requestToken || !overlay) return;
    host.innerHTML = '';
    const error = document.createElement('div');
    error.className = 'global-search-error';
    error.textContent = err && err.message ? err.message : 'Unable to search SafeLedger.';
    host.appendChild(error);
  }
}

function open() {
  if (overlay) return;
  if (typeof params.isUnlocked === 'function' && !params.isUnlocked()) return;
  overlay = document.createElement('div');
  overlay.className = 'global-search-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Global Search');

  const panel = document.createElement('section');
  panel.className = 'global-search-panel';
  overlay.appendChild(panel);

  const header = document.createElement('div');
  header.className = 'global-search-header';
  const heading = document.createElement('div');
  appendText(heading, 'h2', '', 'Global Search');
  appendText(heading, 'p', '', 'Search Profiles, Wallets, and Assets without indexing secret values.');
  header.appendChild(heading);
  const esc = appendText(header, 'span', 'global-search-shortcut', 'ESC');
  esc.setAttribute('aria-hidden', 'true');
  panel.appendChild(header);

  const searchWrap = document.createElement('div');
  searchWrap.className = 'global-search-input-wrap';
  const icon = document.createElement('i');
  icon.className = 'fa fa-search';
  icon.setAttribute('aria-hidden', 'true');
  searchWrap.appendChild(icon);
  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'form-control global-search-input';
  input.placeholder = 'Search names, tags, symbols, models, public addresses…';
  input.autocomplete = 'off';
  input.spellcheck = false;
  searchWrap.appendChild(input);
  panel.appendChild(searchWrap);

  const privacy = document.createElement('div');
  privacy.className = 'global-search-privacy';
  const privacyIcon = document.createElement('i');
  privacyIcon.className = 'fa fa-shield';
  privacyIcon.setAttribute('aria-hidden', 'true');
  privacy.appendChild(privacyIcon);
  appendText(privacy, 'span', '', 'Not indexed: balances, notes, recovery locations/instructions, passwords, PINs, seeds, private keys, or sensitive custom fields.');
  panel.appendChild(privacy);

  const results = document.createElement('div');
  results.className = 'global-search-results';
  panel.appendChild(results);
  renderResults(results, [], '');

  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => runSearch(input, results), 100);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const first = results.querySelector('.global-search-result');
      if (first) {
        event.preventDefault();
        first.click();
      }
    }
  });
  overlay.addEventListener('mousedown', (event) => { if (event.target === overlay) close(); });
  document.body.appendChild(overlay);
  setTimeout(() => input.focus(), 0);
}

function configure(options = {}) {
  params = options;
  if (configured || typeof document === 'undefined') return;
  configured = true;
  window.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('globalSearchButton');
    if (button) button.addEventListener('click', open);
  });
  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'k') {
      event.preventDefault();
      if (overlay) close(); else open();
    } else if (event.key === 'Escape' && overlay) close();
  });
}

exports.configure = configure;
exports.open = open;
exports.close = close;
exports._test = { resultIcon, renderResults };
