'use strict';

const rendererNavigation = require('./renderer');

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

function statusClass(status) {
  return status === 'Ready' ? 'is-ready' : status === 'Needs Review' ? 'is-review' : 'is-incomplete';
}

function makeStatus(status) {
  const badge = document.createElement('span');
  badge.className = `dashboard-status ${statusClass(status)}`;
  badge.textContent = status;
  return badge;
}

function openWallet(item = {}) {
  const navigate = rendererNavigation && rendererNavigation._test && rendererNavigation._test.navigateGlobalResult;
  if (typeof navigate !== 'function') return;
  navigate({
    type: 'wallet',
    profileFile: String(item.profileFile || ''),
    walletIndex: Number(item.walletIndex)
  });
}

async function openPortableStorageFolder() {
  if (!window.safeLedgerApi || typeof window.safeLedgerApi.openDataFolder !== 'function') {
    window.alert('SafeLedgerData folder access is unavailable in this build.');
    return;
  }
  try {
    const result = await window.safeLedgerApi.openDataFolder();
    if (!result || result.ok !== true) {
      window.alert(result && result.message ? result.message : 'SafeLedger could not open the SafeLedgerData folder.');
    }
  } catch (_) {
    window.alert('SafeLedger could not open the SafeLedgerData folder.');
  }
}

function makeHealthTitle(titleText, options = {}) {
  const title = document.createElement('div');
  title.className = 'dashboard-list-title';

  const text = document.createElement('span');
  text.textContent = titleText;
  title.appendChild(text);

  if (typeof options.onActivate === 'function') {
    title.classList.add('has-action');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dashboard-title-action';
    button.title = options.title || 'Open';
    button.setAttribute('aria-label', options.ariaLabel || options.title || 'Open');
    button.innerHTML = '<i class="fa fa-external-link" aria-hidden="true"></i>';
    button.addEventListener('click', options.onActivate);
    title.appendChild(button);
  }

  return title;
}

function appendWalletList(section, items, emptyText, showDate, actionable = false) {
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
    const row = document.createElement(actionable ? 'button' : 'div');
    row.className = `dashboard-list-row${actionable ? ' dashboard-list-row-action' : ''}`;
    if (actionable) {
      row.type = 'button';
      row.title = `Open ${item.walletName} to fix recovery readiness`;
      row.setAttribute('aria-label', `Open ${item.walletName} in ${item.profileName} to fix recovery readiness`);
      row.addEventListener('click', () => openWallet(item));
    }
    const main = document.createElement(actionable ? 'span' : 'div');
    main.className = 'dashboard-list-main';
    const title = document.createElement(actionable ? 'span' : 'div');
    title.className = 'dashboard-list-title';
    title.textContent = item.walletName;
    const meta = document.createElement(actionable ? 'span' : 'div');
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

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return 'Unavailable';
  if (bytes >= 1024 ** 3) return `${(bytes / (1024 ** 3)).toFixed(1)} GB free`;
  if (bytes >= 1024 ** 2) return `${(bytes / (1024 ** 2)).toFixed(0)} MB free`;
  return `${Math.round(bytes / 1024)} KB free`;
}

function backupAgeLabel(entry) {
  if (!entry || entry.state === 'never') return 'Never';
  const days = Number(entry.ageDays || 0);
  if (days === 0) return 'Today';
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function appendHealthRow(section, titleText, metaText, statusText, statusKind, titleOptions = {}) {
  const row = document.createElement('div');
  row.className = 'dashboard-list-row device-health-row';
  const main = document.createElement('div');
  main.className = 'dashboard-list-main';
  const title = makeHealthTitle(titleText, titleOptions);
  const meta = document.createElement('div');
  meta.className = 'dashboard-list-meta';
  meta.textContent = metaText;
  main.appendChild(title);
  main.appendChild(meta);
  row.appendChild(main);
  const badge = makeStatus(statusKind || statusText);
  badge.textContent = statusText;
  row.appendChild(badge);
  section.appendChild(row);
}

function renderDeviceHealth(area, device = {}) {
  const section = document.createElement('section');
  section.className = 'dashboard-section device-health-section';
  const title = document.createElement('h2');
  title.textContent = 'Device & Backup Health';
  section.appendChild(title);

  const storage = device.storage;
  if (storage) {
    const storageReady = storage.connected === true && storage.writable === true;
    const status = storageReady ? 'Ready' : storage.connected ? 'Needs Review' : 'Incomplete';
    const label = storageReady ? 'Healthy' : storage.connected ? 'Review' : 'Unavailable';
    const meta = storage.connected
      ? `${storage.writable ? 'SafeLedgerData writable' : 'SafeLedgerData not writable'} • ${formatBytes(storage.freeBytes)}`
      : `SafeLedgerData ${storage.reason || 'unavailable'}`;
    appendHealthRow(section, 'Portable storage', meta, label, status, storage.connected ? {
      onActivate: openPortableStorageFolder,
      title: 'Open SafeLedgerData folder',
      ariaLabel: 'Open SafeLedgerData folder in the system file manager'
    } : {});
  } else {
    appendHealthRow(section, 'Portable storage', 'Storage status unavailable.', 'Review', 'Needs Review');
  }

  const backupHealth = device.backupHealth;
  if (backupHealth) {
    const backupDue = !backupHealth.backup || backupHealth.backup.state === 'never' || backupHealth.backup.state === 'due';
    const verifyDue = !backupHealth.verified || backupHealth.verified.state === 'never' || backupHealth.verified.state === 'due';
    appendHealthRow(
      section,
      'Encrypted backup',
      `Last backup: ${backupAgeLabel(backupHealth.backup)} • Last verified: ${backupAgeLabel(backupHealth.verified)}`,
      backupDue || verifyDue ? 'Review' : 'Current',
      backupDue || verifyDue ? 'Needs Review' : 'Ready'
    );
  } else {
    appendHealthRow(section, 'Encrypted backup', 'Backup health status unavailable.', 'Review', 'Needs Review');
  }

  area.appendChild(section);
}

function render(summary, device = {}) {
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

  renderDeviceHealth(area, device);

  const attention = document.createElement('section');
  attention.className = 'dashboard-section';
  const attentionTitle = document.createElement('h2');
  attentionTitle.textContent = 'Needs Attention';
  attention.appendChild(attentionTitle);
  appendWalletList(attention, summary.needsAttention || [], 'Everything documented is currently ready.', false, true);
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
    const [result, storage, backupResult] = await Promise.all([
      window.safeLedgerApi.getDashboardSummary(),
      typeof window.safeLedgerApi.getStorageHealth === 'function' ? window.safeLedgerApi.getStorageHealth().catch(() => null) : Promise.resolve(null),
      typeof window.safeLedgerApi.getBackupHealth === 'function' ? window.safeLedgerApi.getBackupHealth().catch(() => null) : Promise.resolve(null)
    ]);
    if (!result || !result.ok) throw new Error(result && result.message ? result.message : 'Unable to build dashboard.');
    render(result.summary, {
      storage,
      backupHealth: backupResult && backupResult.health ? backupResult.health : null
    });
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
exports._test = { formatBytes, backupAgeLabel, renderDeviceHealth, makeStatus, makeHealthTitle, openPortableStorageFolder, openWallet, appendWalletList };
