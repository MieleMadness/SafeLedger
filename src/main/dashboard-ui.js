'use strict';

const detailActions = require('./detail-actions');
const recoveryIntelligenceUi = require('./recovery-intelligence-dashboard-ui');
const recoverySimulator = require('./recovery-simulator');
const motion = require('./motion-ui');

let navigation = {};

function configure(options = {}) {
  navigation = Object.assign({}, options);
}

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

function makeSection(titleText, className = '', helpText = '') {
  const section = document.createElement('section');
  section.className = `dashboard-section${className ? ` ${className}` : ''}`;
  const title = document.createElement('h2');
  title.textContent = titleText;
  section.appendChild(title);
  if (helpText) {
    const help = document.createElement('p');
    help.className = 'dashboard-section-help';
    help.textContent = helpText;
    section.appendChild(help);
  }
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
  if (typeof navigation.onOpenWallet !== 'function') return;
  navigation.onOpenWallet({
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

function appendAttentionGaps(main, item) {
  const gaps = Array.isArray(item && item.actions) ? item.actions.slice(0, 3) : [];
  if (!gaps.length) return;
  const list = document.createElement('ul');
  list.className = 'dashboard-attention-gaps';
  for (const gap of gaps) {
    if (!gap || !gap.action) continue;
    const li = document.createElement('li');
    li.textContent = gap.action;
    list.appendChild(li);
  }
  if (list.childNodes.length) main.appendChild(list);
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
      ? 'Click a recently verified Vault Item below to open it.'
      : 'Each item shows its readiness score and the most important recovery gaps. Click a Vault Item to resolve them.';
    section.appendChild(helper);
  }

  const list = document.createElement('div');
  list.className = 'dashboard-list';
  for (const item of items) {
    const row = document.createElement('div');
    row.className = `dashboard-list-row${actionable ? ' dashboard-list-row-action' : ''}`;
    const main = document.createElement('div');
    main.className = `dashboard-list-main${actionable ? ' dashboard-list-main-action' : ''}`;

    if (actionable) {
      const label = `Open ${item.walletName} in ${item.profileName}`;
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      row.title = `Open ${item.walletName}`;
      row.setAttribute('aria-label', label);
      row.addEventListener('click', () => openWallet(item));
      row.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openWallet(item);
      });
    }

    const title = document.createElement('div');
    title.className = 'dashboard-list-title';
    title.textContent = item.walletName;
    const meta = document.createElement('div');
    meta.className = 'dashboard-list-meta';
    meta.textContent = showDate && item.lastVerified
      ? `${item.profileName} • Verified ${new Date(item.lastVerified).toLocaleDateString()}`
      : `${item.profileName} • ${item.score}% recovery ready`;
    main.appendChild(title);
    main.appendChild(meta);
    if (!showDate) appendAttentionGaps(main, item);
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
  if (!total) return 'Vault contents: Add a wallet, exchange account, or Web / Web3 service to begin building your vault inventory.';
  const parts = [];
  if (hardware) parts.push(quantity(hardware, 'hardware wallet'));
  if (software) parts.push(quantity(software, 'software wallet'));
  if (other) parts.push(quantity(other, 'custom / other wallet'));
  if (wallets && !hardware && !software && !other) parts.push(quantity(wallets, 'wallet'));
  if (exchanges) parts.push(quantity(exchanges, 'exchange account'));
  if (services) parts.push(quantity(services, 'Web / Web3 service'));
  return `Vault contents: ${parts.join(' • ')}`;
}

function makeReadinessRing(percent) {
  const wrap = document.createElement('div');
  wrap.className = 'dashboard-readiness-ring';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  background.setAttribute('cx', '50');
  background.setAttribute('cy', '50');
  background.setAttribute('r', '38');
  background.setAttribute('class', 'dashboard-readiness-track');
  const progress = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  progress.setAttribute('cx', '50');
  progress.setAttribute('cy', '50');
  progress.setAttribute('r', '38');
  progress.setAttribute('class', 'dashboard-readiness-progress');
  const circumference = 2 * Math.PI * 38;
  progress.style.strokeDasharray = String(circumference);
  progress.dataset.circumference = String(circumference);
  svg.appendChild(background);
  svg.appendChild(progress);
  const copy = document.createElement('div');
  copy.className = 'dashboard-readiness-copy';
  const value = document.createElement('strong');
  value.textContent = `${Number(percent) || 0}%`;
  const label = document.createElement('span');
  label.textContent = 'Recovery readiness';
  copy.appendChild(value);
  copy.appendChild(label);
  wrap.appendChild(svg);
  wrap.appendChild(copy);
  return { wrap, progress };
}

function renderInventory(area, summary) {
  const counts = summary.counts || {};
  const section = makeSection('Vault Inventory', 'vault-inventory-section', vaultContentsLabel(counts));
  const stats = document.createElement('div');
  stats.className = 'dashboard-stats vault-inventory-stats';
  const vaultItems = Number(counts.wallets || 0) + Number(counts.exchanges || 0) + Number(counts.services || 0);
  stats.appendChild(makeStat('Profiles', counts.profiles || 0));
  stats.appendChild(makeStat('Vault Items', vaultItems));
  stats.appendChild(makeStat('Exchanges', counts.exchanges || 0));
  stats.appendChild(makeStat('Services', counts.services || 0));
  stats.appendChild(makeStat('Assets', counts.assets || 0));
  section.appendChild(stats);
  area.appendChild(section);
}

function renderRecoveryHealth(area, summary) {
  const section = makeSection('Recovery Health', 'vault-recovery-section', 'See how many Vault Items are recovery-ready, need a review, or still have incomplete recovery documentation.');
  const stats = document.createElement('div');
  stats.className = 'dashboard-stats recovery-health-stats';
  stats.appendChild(makeStat('Ready', summary.counts.ready));
  stats.appendChild(makeStat('Needs Review', summary.counts.needsReview));
  stats.appendChild(makeStat('Incomplete', summary.counts.incomplete));
  section.appendChild(stats);
  area.appendChild(section);
}

function appendMaintenanceItem(list, titleText, lines) {
  const item = document.createElement('li');
  item.className = 'dashboard-maintenance-item';
  const title = document.createElement('strong');
  title.textContent = titleText;
  item.appendChild(title);
  const values = Array.isArray(lines) ? lines.filter(Boolean) : [lines].filter(Boolean);
  if (values.length === 1) {
    const text = document.createElement('span');
    text.textContent = values[0];
    item.appendChild(text);
  } else if (values.length) {
    const details = document.createElement('ul');
    details.className = 'dashboard-maintenance-details';
    for (const value of values) {
      const detail = document.createElement('li');
      detail.textContent = value;
      details.appendChild(detail);
    }
    item.appendChild(details);
  }
  list.appendChild(item);
}

function renderMaintenanceSnapshot(area, summary, device = {}) {
  const section = makeSection('Maintenance Snapshot', 'vault-maintenance-section', 'Review stale recovery information, documentation coverage, and the latest local backup activity.');
  const list = document.createElement('ul');
  list.className = 'dashboard-maintenance-list';
  const staleInfo = summary.stale || {};
  appendMaintenanceItem(list, 'Stale information', staleInfo.count
    ? `${staleInfo.count} vault item${staleInfo.count === 1 ? '' : 's'} ${staleInfo.neverVerified ? `(${staleInfo.neverVerified} never verified) ` : ''}need a verification review.`
    : 'All vault items have been verified within the last 6 months.');
  const rc = summary.recoveryCoverage || { total: 0, method: 0, location: 0, drills: 0 };
  appendMaintenanceItem(list, 'Recovery coverage', rc.total
    ? [`${rc.method}/${rc.total} recovery methods documented`, `${rc.location}/${rc.total} recovery locations documented`, `${rc.drills}/${rc.total} recovery validations completed`]
    : 'No vault items are available for recovery coverage yet.');
  const backupHealth = device.backupHealth || {};
  const activity = Array.isArray(device.activity) ? device.activity[0] : null;
  appendMaintenanceItem(list, 'Last Backup', [
    `Backup: ${backupAgeLabel(backupHealth.backup)}`,
    `Verified backup: ${backupAgeLabel(backupHealth.verified)}`,
    `Vault activity: ${formatActivityTime(activity)}`
  ]);
  section.appendChild(list);
  area.appendChild(section);
}

function appendSimulatorList(host, titleText, values) {
  if (!Array.isArray(values) || !values.length) return;
  const title = document.createElement('strong');
  title.className = 'recovery-simulator-answer-label';
  title.textContent = titleText;
  host.appendChild(title);
  const list = document.createElement('ul');
  for (const value of values) {
    const li = document.createElement('li');
    li.textContent = value;
    list.appendChild(li);
  }
  host.appendChild(list);
}

function renderSimulatorResult(host, simulation) {
  host.innerHTML = '';
  const header = document.createElement('div');
  header.className = 'recovery-simulator-answer-header';
  const score = document.createElement('strong');
  score.className = 'recovery-simulator-answer-score';
  score.textContent = `${simulation.score}%`;
  header.appendChild(score);
  header.appendChild(makeStatus(simulation.status));
  host.appendChild(header);
  const headline = document.createElement('p');
  headline.className = 'recovery-simulator-headline';
  headline.textContent = simulation.headline;
  host.appendChild(headline);
  appendSimulatorList(host, 'Strengths', simulation.strengths);
  appendSimulatorList(host, 'Gaps to resolve', simulation.gaps);
}

function renderRecoverySimulator(area, summary, device = {}) {
  const section = makeSection(
    'What Happens If…',
    'recovery-simulator-section',
    'Open a scenario below to see how your current recovery documentation would hold up. SafeLedger evaluates only local, aggregate recovery evidence—this is a planning check, not a guarantee.'
  );
  const accordion = document.createElement('div');
  accordion.className = 'recovery-simulator-accordion-list';

  for (const scenario of recoverySimulator.SCENARIOS) {
    const details = document.createElement('details');
    details.className = 'recovery-simulator-accordion';
    const summaryRow = document.createElement('summary');
    summaryRow.className = 'recovery-simulator-accordion-summary';

    const icon = document.createElement('span');
    icon.className = 'recovery-simulator-topic-icon';
    icon.innerHTML = `<i class="fa ${scenario.icon}" aria-hidden="true"></i>`;
    const copy = document.createElement('span');
    copy.className = 'recovery-simulator-topic-copy';
    const title = document.createElement('strong');
    title.textContent = scenario.title;
    const description = document.createElement('small');
    description.textContent = scenario.description;
    copy.appendChild(title);
    copy.appendChild(description);
    const chevron = document.createElement('i');
    chevron.className = 'fa fa-chevron-down recovery-simulator-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    summaryRow.appendChild(icon);
    summaryRow.appendChild(copy);
    summaryRow.appendChild(chevron);
    details.appendChild(summaryRow);

    const answer = document.createElement('div');
    answer.className = 'recovery-simulator-accordion-answer';
    details.appendChild(answer);
    let rendered = false;
    details.addEventListener('toggle', () => {
      if (!details.open || rendered) return;
      rendered = true;
      renderSimulatorResult(answer, recoverySimulator.simulate(scenario.id, summary.simulationFacts || {}, device.backupHealth || null));
      motion.reveal(answer);
    });
    accordion.appendChild(details);
  }

  section.appendChild(accordion);
  area.appendChild(section);
}

function renderDeviceHealth(area, device = {}) {
  const section = makeSection('Device & Backup Health', 'device-health-section', 'Check SafeLedgerData storage availability and encrypted-backup freshness. These checks stay local to this device.');
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

function render(summary, device = {}, intelligence = null) {
  const area = clearArea();
  if (!area) return;
  const header = document.createElement('div');
  header.className = 'dashboard-header recovery-command-center-header';
  const headingWrap = document.createElement('div');
  const heading = document.createElement('h1');
  heading.textContent = 'Vault Overview';
  const intro = document.createElement('p');
  intro.textContent = 'Your local Recovery Command Center: inventory, recovery readiness, scenario planning, backups, and recovery intelligence—all calculated from encrypted SafeLedger data on this device.';
  headingWrap.appendChild(heading);
  headingWrap.appendChild(intro);
  const ring = makeReadinessRing(summary.readinessPercent);
  header.appendChild(headingWrap);
  header.appendChild(ring.wrap);
  area.appendChild(header);

  if (summary.profileReadErrors) {
    const warning = document.createElement('p');
    warning.className = 'alert alert-warning dashboard-warning';
    warning.textContent = `${summary.profileReadErrors} profile${summary.profileReadErrors === 1 ? '' : 's'} could not be authenticated/read for this overview.`;
    area.appendChild(warning);
  }

  renderInventory(area, summary);
  renderRecoveryHealth(area, summary);
  renderMaintenanceSnapshot(area, summary, device);
  renderRecoverySimulator(area, summary, device);
  renderDeviceHealth(area, device);
  if (intelligence) recoveryIntelligenceUi.renderIntelligence(area, intelligence);

  const attention = makeSection('Recovery Needs Attention', 'recovery-needs-attention-section', 'Vault Items that are not fully recovery-ready appear here with their readiness score and most important gaps.');
  appendWalletList(attention, summary.needsAttention || [], 'Everything documented is currently ready.', false, true);
  area.appendChild(attention);

  const recent = makeSection('Recently Verified');
  appendWalletList(recent, summary.recentlyVerified || [], 'No Vault Item recovery plans have been verified yet.', true, true);
  area.appendChild(recent);

  motion.animateReadiness(ring.progress, summary.readinessPercent);
  motion.dashboardEntrance(area);
}

async function showDashboard() {
  detailActions.clear();
  const area = clearArea();
  if (!area || !window.safeLedgerApi || typeof window.safeLedgerApi.getDashboardSummary !== 'function') return;
  const loading = document.createElement('p');
  loading.className = 'dashboard-loading';
  loading.textContent = 'Reviewing encrypted vault records locally…';
  area.appendChild(loading);
  try {
    const [result, storage, backupResult, activityResult, intelligenceResult] = await Promise.all([
      window.safeLedgerApi.getDashboardSummary(),
      typeof window.safeLedgerApi.getStorageHealth === 'function' ? window.safeLedgerApi.getStorageHealth().catch(() => null) : Promise.resolve(null),
      typeof window.safeLedgerApi.getBackupHealth === 'function' ? window.safeLedgerApi.getBackupHealth().catch(() => null) : Promise.resolve(null),
      typeof window.safeLedgerApi.getActivityHistory === 'function' ? window.safeLedgerApi.getActivityHistory(1).catch(() => null) : Promise.resolve(null),
      typeof window.safeLedgerApi.getRecoveryIntelligence === 'function' ? window.safeLedgerApi.getRecoveryIntelligence().catch(() => null) : Promise.resolve(null)
    ]);
    if (!result || !result.ok) throw new Error(result && result.message ? result.message : 'Unable to build Vault Overview.');
    render(result.summary, {
      storage,
      backupHealth: backupResult && backupResult.health ? backupResult.health : null,
      activity: activityResult && Array.isArray(activityResult.entries) ? activityResult.entries : []
    }, intelligenceResult && intelligenceResult.ok === true ? intelligenceResult.intelligence : null);
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
  if (button) button.addEventListener('click', (event) => {
    event.preventDefault();
    showDashboard();
  });
});

exports.configure = configure;
exports.show = showDashboard;
exports.render = render;
exports.renderIntelligence = recoveryIntelligenceUi.renderIntelligence;
exports._test = {
  formatBytes,
  backupAgeLabel,
  formatActivityTime,
  renderInventory,
  renderMaintenanceSnapshot,
  renderRecoveryHealth,
  renderDeviceHealth,
  renderRecoverySimulator,
  renderSimulatorResult,
  makeReadinessRing,
  makeStatus,
  makeHealthTitle,
  openPortableStorageFolder,
  openWallet,
  appendWalletList,
  appendAttentionGaps,
  appendMaintenanceItem,
  quantity,
  vaultContentsLabel
};
