'use strict';

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
  if (!area) return null;
  const existing = area.querySelector('#recoveryIntelligenceSection');
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
  } else {
    section.appendChild(issues);
  }

  const deviceSection = Array.from(area.querySelectorAll('.dashboard-section')).find((candidate) => {
    const h2 = candidate.querySelector('h2');
    return h2 && h2.textContent === 'Device & Backup Health';
  });
  if (deviceSection && deviceSection.nextSibling) area.insertBefore(section, deviceSection.nextSibling);
  else area.appendChild(section);
  return section;
}

module.exports = { appendIssue, renderIntelligence, _test: { appendIssue, renderIntelligence } };
