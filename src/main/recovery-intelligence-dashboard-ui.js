'use strict';

let loading = false;

function makeStatus(status) {
  const badge = document.createElement('span');
  badge.className = `dashboard-status ${status === 'Ready' ? 'is-ready' : status === 'Needs Review' ? 'is-review' : 'is-incomplete'}`;
  badge.textContent = status;
  return badge;
}

function renderWalletRows(section, items, emptyText, showDate) {
  Array.from(section.children).slice(1).forEach((node) => node.remove());
  if (!items || !items.length) {
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
      : `${item.profileName} • ${item.score}% recovery health`;
    main.appendChild(title);
    main.appendChild(meta);
    row.appendChild(main);
    row.appendChild(makeStatus(item.status));
    list.appendChild(row);
  }
  section.appendChild(list);
}

function refreshDashboardSummary(area, summary) {
  if (!summary) return;
  const readiness = area.querySelector('.dashboard-readiness strong');
  if (readiness) readiness.textContent = `${summary.readinessPercent}%`;
  const stats = Array.from(area.querySelectorAll('.dashboard-stat'));
  const values = [summary.counts.profiles, summary.counts.wallets, summary.counts.assets, summary.counts.ready];
  stats.slice(0, 4).forEach((card, index) => {
    const value = card.querySelector('.dashboard-stat-value');
    if (value) value.textContent = String(values[index]);
  });
  const sections = Array.from(area.querySelectorAll('.dashboard-section'));
  const attention = sections.find((section) => {
    const h2 = section.querySelector('h2');
    return h2 && h2.textContent === 'Needs Attention';
  });
  const recent = sections.find((section) => {
    const h2 = section.querySelector('h2');
    return h2 && h2.textContent === 'Recently Verified';
  });
  if (attention) renderWalletRows(attention, summary.needsAttention || [], 'Everything documented is currently ready.', false);
  if (recent) renderWalletRows(recent, summary.recentlyVerified || [], 'No vault-item recovery plans have been verified yet.', true);
}

function appendIssue(list, title, meta) {
  const row = document.createElement('div');
  row.className = 'dashboard-list-row';
  const main = document.createElement('div');
  main.className = 'dashboard-list-main';
  const heading = document.createElement('div');
  heading.className = 'dashboard-list-title';
  heading.textContent = title;
  const detail = document.createElement('div');
  detail.className = 'dashboard-list-meta';
  detail.textContent = meta;
  main.appendChild(heading);
  main.appendChild(detail);
  row.appendChild(main);
  list.appendChild(row);
}

function renderIntelligence(area, intelligence) {
  const existing = document.getElementById('recoveryIntelligenceSection');
  if (existing) existing.remove();

  const section = document.createElement('section');
  section.id = 'recoveryIntelligenceSection';
  section.className = 'dashboard-section recovery-intelligence-section';
  const heading = document.createElement('h2');
  heading.textContent = 'Recovery Intelligence';
  section.appendChild(heading);

  const intro = document.createElement('p');
  intro.className = 'dashboard-empty';
  intro.textContent = 'Offline validation and duplicate checks. Results contain navigation/status metadata only—never addresses, seed phrases, private keys, fingerprints, or backup paths.';
  section.appendChild(intro);

  const addresses = intelligence && intelligence.addressValidation || { checked: 0, valid: 0, invalid: 0, unsupported: 0, invalidItems: [] };
  const mnemonic = intelligence && intelligence.bip39 || { checked: 0, valid: 0, invalid: 0, invalidWallets: [] };
  const duplicates = intelligence && intelligence.duplicates || { publicAddress: [], walletMetadata: [], sensitive: [] };
  const publicDuplicateCount = (duplicates.publicAddress || []).length;
  const sensitiveDuplicateCount = (duplicates.sensitive || []).length;
  const metadataDuplicateCount = (duplicates.walletMetadata || []).length;

  const stats = document.createElement('div');
  stats.className = 'dashboard-stats';
  for (const [label, value] of [
    ['Addresses checked', addresses.checked || 0],
    ['Invalid addresses', addresses.invalid || 0],
    ['BIP39 checked', mnemonic.checked || 0],
    ['Duplicate groups', publicDuplicateCount + sensitiveDuplicateCount + metadataDuplicateCount]
  ]) {
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
    stats.appendChild(card);
  }
  section.appendChild(stats);

  const issues = document.createElement('div');
  issues.className = 'dashboard-list';
  for (const item of (addresses.invalidItems || []).slice(0, 8)) {
    appendIssue(issues, `${item.walletName} • ${item.assetName}`, `${item.profileName} • Address format needs review (${item.family})`);
  }
  for (const item of (mnemonic.invalidWallets || []).slice(0, 8)) {
    appendIssue(issues, item.walletName, `${item.profileName} • BIP39 check needs review (${item.reason}, ${item.wordCount || 0} words)`);
  }
  for (const group of (duplicates.publicAddress || []).slice(0, 6)) {
    appendIssue(issues, 'Duplicate public address', `${group.count} Assets reference the same public address; review the listed Vault Item / Asset locations.`);
  }
  for (const group of (duplicates.sensitive || []).slice(0, 6)) {
    const kinds = Array.from(new Set((group.occurrences || []).map((item) => item.kind))).join(', ');
    appendIssue(issues, 'Matching sensitive recovery data', `${group.count} entries match within this unlocked session (${kinds || 'sensitive recovery data'}). No fingerprint or secret is stored.`);
  }
  for (const group of (duplicates.walletMetadata || []).slice(0, 6)) {
    appendIssue(issues, 'Repeated Vault Item recovery metadata', `${group.count} Vault Item entries share the same normalized Vault Item/recovery-method metadata.`);
  }

  if (!issues.children.length) {
    const clean = document.createElement('p');
    clean.className = 'dashboard-empty';
    clean.textContent = addresses.invalid || mnemonic.invalid
      ? 'Review the validation counts above.'
      : 'No supported validation errors or duplicate recovery-data groups were detected.';
    section.appendChild(clean);
  } else section.appendChild(issues);

  const deviceSection = Array.from(area.querySelectorAll('.dashboard-section')).find((candidate) => {
    const h2 = candidate.querySelector('h2');
    return h2 && h2.textContent === 'Device & Backup Health';
  });
  if (deviceSection && deviceSection.nextSibling) area.insertBefore(section, deviceSection.nextSibling);
  else area.appendChild(section);
}

async function enhanceDashboard() {
  const area = document.getElementById('detailArea');
  if (!area || loading || document.getElementById('recoveryIntelligenceSection')) return;
  const heading = area.querySelector('.dashboard-header h1');
  if (!heading || heading.textContent !== 'Recovery Dashboard') return;
  if (!window.safeLedgerApi || typeof window.safeLedgerApi.getRecoveryIntelligence !== 'function') return;
  loading = true;
  try {
    const result = await window.safeLedgerApi.getRecoveryIntelligence();
    if (!result || !result.ok) return;
    if (!area.querySelector('.dashboard-header h1')) return;
    refreshDashboardSummary(area, result.summary);
    renderIntelligence(area, result.intelligence);
  } catch (_) {
  } finally {
    loading = false;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const observer = new MutationObserver(() => { setTimeout(enhanceDashboard, 0); });
  observer.observe(area, { childList: true, subtree: true });
});

exports._test = { refreshDashboardSummary, renderIntelligence };