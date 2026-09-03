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

function makeSection(titleText, className = '') {
  const section = document.createElement('section');
  section.className = `dashboard-section${className ? ` ${className}` : ''}`;
  const title = document.createElement('h2');
  title.textContent = titleText;
  section.appendChild(title);
  return section;
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
    source: 'dashboard',
    profileIndex: Number(item.profileIndex),
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

  if (actionable) {
    const helper = document.createElement('p');
    helper.className = 'dashboard-section-help';
    helper.textContent = showDate
      ? 'Click a recently verified vault item below to open it.'
      : 'Click a vault item below to open it and resolve the recovery gaps.';
    section.appendChild(helper);
  }

  const list = document.createElement('div');
  list.className = 'dashboard-list';
  for (const item of items) {
    const row = document.createElement('div');
    row.className = `dashboard-list-row${actionable ? ' dashboard-list-row-action' : ''}`;

    const main = document.createElement(actionable ? 'button' : 'div');
    main.className = `dashboard-list-main${actionable ? ' dashboard-list-main-action' : ''}`;
    if (actionable) {
      main.type = 'button';
      main.title = `Open ${item.walletName}`;
      main.setAttribute('aria-label', `Open ${item.walletName} in ${item.profileName}`);
      main.addEventListener('click', () => openWallet(item));
    }

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

function formatActivityTime(entry) {
  if (!entry || !entry.timestamp) return 'No activity yet';
  const date = new Date(entry.timestamp);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString();
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

function quantity(count, singular, plural) {
  const value = Number(count) || 0;
  return `${value} ${value === 1 ? singular : (plural || `${singular}s`)}`;
}

function vaultContentsLabel(counts = {}) {
  const hardware = Number(counts.hardwareWallets) || 0;
  const software = Number(counts.softwareWallets) || 0;
  const other = Number(counts.otherWallets) || 0;
  const wallets = Number(counts.wallets) || 0;
  const exchanges = Number(counts.exchanges) || 0;
  const services = Number(counts.services) || 0;
  const total = wallets + exchanges + services;
  if (!total) return 'Add a wallet, exchange account, or Web / Web3 service to begin building your vault inventory.';

  const parts = [];
  if (hardware) parts.push(quantity(hardware, 'hardware wallet'));
  if (software) parts.push(quantity(software, 'software wallet'));
  if (other) parts.push(quantity(other, 'custom / other wallet'));
  if (wallets && !hardware && !software && !other) parts.push(quantity(wallets, 'wallet'));
  if (exchanges) parts.push(quantity(exchanges, 'exchange account'));
  if (services) parts.push(quantity(services, 'Web / Web3 service'));
  return `Vault contents: ${parts.join(' • ')}`;
}

function renderInventory(area, summary) {
  const counts = summary.counts || {};
  const section = makeSection('Vault Inventory', 'vault-inventory-section');
  const stats = document.createElement('div');
  stats.className = 'dashboard-stats vault-inventory-stats';
  const vaultItems = Number(counts.wallets || 0) + Number(counts.exchanges || 0) + Number(counts.services || 0);
  stats.appendChild(makeStat('Profiles', counts.profiles || 0));
  stats.appendChild(makeStat('Vault Items', vaultItems));
  stats.appendChild(makeStat('Exchanges', counts.exchanges || 0));
  stats.appendChild(makeStat('Services', counts.services || 0));
  stats.appendChild(makeStat('Assets', counts.assets || 0));
  section.appendChild(stats);

  const meta = document.createElement('p');
  meta.className = 'dashboard-inventory-meta';
  meta.textContent = vaultContentsLabel(counts);
  section.appendChild(meta);
  area.appendChild(section);
}

function renderRecoveryHealth(area, summary) {
  const section = makeSection('Recovery Health', 'vault-recovery-section');
  const stats = document.createElement('div');
  stats.className = 'dashboard-stats recovery-health-stats';
  stats.appendChild(makeStat('Ready', summary.counts.ready));
  stats.appendChild(makeStat('Needs Review', summary.counts.needsReview));
  stats.appendChild(makeStat('Incomplete', summary.counts.incomplete));
  section.appendChild(stats);
  area.appendChild(section);
}

function renderMaintenanceSnapshot(area, summary, device = {}) {
  const section = makeSection('Maintenance Snapshot', 'vault-maintenance-section');
  const grid = document.createElement('div');
  grid.className = 'dashboard-maintenance-grid';

  const stale = document.createElement('div');
  stale.className = 'dashboard-maintenance-card';
  const staleTitle = document.createElement('strong');
  staleTitle.textContent = 'Stale information';
  const staleText = document.createElement('span');
  const staleInfo = summary.stale || {};
  staleText.textContent = staleInfo.count
    ? `${staleInfo.count} vault item${staleInfo.count === 1 ? '' : 's'} ${staleInfo.neverVerified ? `(${staleInfo.neverVerified} never verified) ` : ''}need a verification review.`
    : 'All vault items have been verified within the last 6 months.';
  stale.appendChild(staleTitle);
  stale.appendChild(staleText);
  grid.appendChild(stale);

  const coverage = document.createElement('div');
  coverage.className = 'dashboard-maintenance-card';
  const coverageTitle = document.createElement('strong');
  coverageTitle.textContent = 'Recovery coverage';
  const coverageText = document.createElement('span');
  const rc = summary.recoveryCoverage || { total: 0, method: 0, location: 0, drills: 0 };
  coverageText.textContent = rc.total
    ? `${rc.method}/${rc.total} methods • ${rc.location}/${rc.total} locations • ${rc.drills}/${rc.total} recovery drills`
    : 'No vault items are available for recovery coverage yet.';
  coverage.appendChild(coverageTitle);
  coverage.appendChild(coverageText);
  grid.appendChild(coverage);

  const dates = document.createElement('div');
  dates.className = 'dashboard-maintenance-card';
  const datesTitle = document.createElement('strong');
  datesTitle.textContent = 'Last maintenance';
  const datesText = document.createElement('span');
  const backupHealth = device.backupHealth || {};
  const activity = Array.isArray(device.activity) ? device.activity[0] : null;
  datesText.textContent = `Backup: ${backupAgeLabel(backupHealth.backup)} • Verified backup: ${backupAgeLabel(backupHealth.verified)} • Vault activity: ${formatActivityTime(activity)}`;
  dates.appendChild(datesTitle);
  dates.appendChild(datesText);
  grid.appendChild(dates);

  section.appendChild(grid);
  area.appendChild(section);
}

function renderDeviceHealth(area, device = {}) {
  const section = makeSection('Device & Backup Health', 'device-health-section');

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
  heading.textContent = 'Vault Overview';
  const intro = document.createElement('p');
  intro.textContent = 'An at-a-glance view of your Profiles, Vault Items, assets, backups, and recovery health. Vault Items include wallets, exchange accounts, and Web / Web3 services. Everything is calculated locally from your encrypted vault.';
  headingWrap.appendChild(heading);
  headingWrap.appendChild(intro);
  const readiness = document.createElement('div');
  readiness.className = 'dashboard-readiness';
  const readinessValue = document.createElement('strong');
  readinessValue.textContent = `${summary.readinessPercent}%`;
  const readinessLabel = document.createElement('span');
  readinessLabel.textContent = ' recovery readiness';
  readiness.appendChild(readinessValue);
  readiness.appendChild(readinessLabel);
  header.appendChild(headingWrap);
  header.appendChild(readiness);
  area.appendChild(header);

  if (summary.profileReadErrors) {
    const warning = document.createElement('p');
    warning.className = 'alert alert-warning dashboard-warning';
    warning.textContent = `${summary.profileReadErrors} profile${summary.profileReadErrors === 1 ? '' : 's'} could not be authenticated/read for this overview.`;
    area.appendChild(warning);
  }

  renderInventory(area, summary);
  renderMaintenanceSnapshot(area, summary, device);
  renderRecoveryHealth(area, summary);
  renderDeviceHealth(area, device);

  const attention = makeSection('Recovery Needs Attention');
  appendWalletList(attention, summary.needsAttention || [], 'Everything documented is currently ready.', false, true);
  area.appendChild(attention);

  const recent = makeSection('Recently Verified');
  appendWalletList(recent, summary.recentlyVerified || [], 'No vault-item recovery plans have been verified yet.', true, true);
  area.appendChild(recent);
}

async function showDashboard() {
  const area = clearArea();
  if (!area || !window.safeLedgerApi || typeof window.safeLedgerApi.getDashboardSummary !== 'function') return;
  const loading = document.createElement('p');
  loading.className = 'dashboard-loading';
  loading.textContent = 'Reviewing encrypted vault records locally…';
  area.appendChild(loading);
  try {
    const [result, storage, backupResult, activityResult] = await Promise.all([
      window.safeLedgerApi.getDashboardSummary(),
      typeof window.safeLedgerApi.getStorageHealth === 'function' ? window.safeLedgerApi.getStorageHealth().catch(() => null) : Promise.resolve(null),
      typeof window.safeLedgerApi.getBackupHealth === 'function' ? window.safeLedgerApi.getBackupHealth().catch(() => null) : Promise.resolve(null),
      typeof window.safeLedgerApi.getActivityHistory === 'function' ? window.safeLedgerApi.getActivityHistory(1).catch(() => null) : Promise.resolve(null)
    ]);
    if (!result || !result.ok) throw new Error(result && result.message ? result.message : 'Unable to build Vault Overview.');
    render(result.summary, {
      storage,
      backupHealth: backupResult && backupResult.health ? backupResult.health : null,
      activity: activityResult && Array.isArray(activityResult.entries) ? activityResult.entries : []
    });
  } catch (err) {
    area.innerHTML = '';
    const message = document.createElement('p');
    message.className = 'alert alert-warning';
    message.textContent = err && err.message ? err.message : 'Unable to build Vault Overview.';
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
exports._test = {
  formatBytes,
  backupAgeLabel,
  formatActivityTime,
  renderInventory,
  renderMaintenanceSnapshot,
  renderRecoveryHealth,
  renderDeviceHealth,
  makeStatus,
  makeHealthTitle,
  openPortableStorageFolder,
  openWallet,
  appendWalletList,
  quantity,
  vaultContentsLabel
};