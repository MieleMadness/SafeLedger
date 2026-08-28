'use strict';

function clearArea() {
  const area = document.getElementById('detailArea');
  if (area) area.innerHTML = '';
  return area;
}

function makeStat(label, value) {
  const card = document.createElement('div');
  card.className = 'dashboard-stat';
  const number = document.createElement('div');
  number.className = 'dashboard-stat-value';
  number.textContent = String(value);
  const text = document.createElement('div');
  text.className = 'dashboard-stat-label';
  text.textContent = label;
  card.appendChild(number);
  card.appendChild(text);
  return card;
}

function makeStatus(status) {
  const badge = document.createElement('span');
  badge.className = `dashboard-status ${status === 'Ready' ? 'is-ready' : status === 'Needs Review' ? 'is-review' : 'is-incomplete'}`;
  badge.textContent = status;
  return badge;
}

function appendWalletList(section, items, emptyText, showDate) {
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'dashboard-empty';
    empty.textContent = emptyText;
    section.appendChild(empty);
    return;
  }
  const list = document.createElement('div');
  list.className = 'dashboard-list';
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'dashboard-list-row';
    const main = document.createElement('div');
    main.className = 'dashboard-list-main';
    const title = document.createElement('div');
    title.className = 'dashboard-list-title';
    title.textContent = item.walletName;
    const meta = document.createElement('div');
    meta.className = 'dashboard-list-meta';
    meta.textContent = showDate && item.lastVerified
      ? `${item.profileName} • Verified ${new Date(item.lastVerified).toLocaleDateString()}`
      : `${item.profileName} • ${item.score}% ready`;
    main.appendChild(title);
    main.appendChild(meta);
    row.appendChild(main);
    row.appendChild(makeStatus(item.status));
    list.appendChild(row);
  }
  section.appendChild(list);
}

function render(summary) {
  const area = clearArea();
  if (!area) return;
  const header = document.createElement('div');
  header.className = 'dashboard-header';
  const headingWrap = document.createElement('div');
  const heading = document.createElement('h1');
  heading.textContent = 'Recovery Dashboard';
  const intro = document.createElement('p');
  intro.textContent = 'A local overview of your crypto recovery preparedness. No balances, wallet addresses, or secrets leave this device.';
  headingWrap.appendChild(heading);
  headingWrap.appendChild(intro);
  const readiness = document.createElement('div');
  readiness.className = 'dashboard-readiness';
  const readinessValue = document.createElement('strong');
  readinessValue.textContent = `${summary.readinessPercent}%`;
  const readinessLabel = document.createElement('span');
  readinessLabel.textContent = ' overall readiness';
  readiness.appendChild(readinessValue);
  readiness.appendChild(readinessLabel);
  header.appendChild(headingWrap);
  header.appendChild(readiness);
  area.appendChild(header);

  const stats = document.createElement('div');
  stats.className = 'dashboard-stats';
  stats.appendChild(makeStat('Profiles', summary.counts.profiles));
  stats.appendChild(makeStat('Wallets', summary.counts.wallets));
  stats.appendChild(makeStat('Assets', summary.counts.assets));
  stats.appendChild(makeStat('Ready', summary.counts.ready));
  area.appendChild(stats);

  if (summary.profileReadErrors) {
    const warning = document.createElement('p');
    warning.className = 'alert alert-warning dashboard-warning';
    warning.textContent = `${summary.profileReadErrors} profile${summary.profileReadErrors === 1 ? '' : 's'} could not be authenticated/read for this summary.`;
    area.appendChild(warning);
  }

  const attention = document.createElement('section');
  attention.className = 'dashboard-section';
  const attentionTitle = document.createElement('h2');
  attentionTitle.textContent = 'Needs Attention';
  attention.appendChild(attentionTitle);
  appendWalletList(attention, summary.needsAttention || [], 'Everything documented is currently ready.', false);
  area.appendChild(attention);

  const recent = document.createElement('section');
  recent.className = 'dashboard-section';
  const recentTitle = document.createElement('h2');
  recentTitle.textContent = 'Recently Verified';
  recent.appendChild(recentTitle);
  appendWalletList(recent, summary.recentlyVerified || [], 'No wallet recovery plans have been verified yet.', true);
  area.appendChild(recent);
}

async function showDashboard() {
  const area = clearArea();
  if (!area || !window.safeLedgerApi || typeof window.safeLedgerApi.getDashboardSummary !== 'function') return;
  const loading = document.createElement('p');
  loading.className = 'dashboard-loading';
  loading.textContent = 'Reviewing encrypted recovery records locally…';
  area.appendChild(loading);
  try {
    const result = await window.safeLedgerApi.getDashboardSummary();
    if (!result || !result.ok) throw new Error(result && result.message ? result.message : 'Unable to build dashboard.');
    render(result.summary);
  } catch (err) {
    area.innerHTML = '';
    const message = document.createElement('p');
    message.className = 'alert alert-warning';
    message.textContent = err && err.message ? err.message : 'Unable to build dashboard.';
    area.appendChild(message);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('dashboardButton');
  if (button) button.addEventListener('click', (event) => { event.preventDefault(); showDashboard(); });
  if (window.safeLedgerApi && typeof window.safeLedgerApi.onResult === 'function') {
    window.safeLedgerApi.onResult((payload) => {
      if (payload && payload.type === 'vaultlist-init' && payload.sessionUnlocked === true) setTimeout(showDashboard, 0);
    });
  }
});

exports.show = showDashboard;
exports.render = render;
