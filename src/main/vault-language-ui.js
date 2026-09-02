'use strict';

function numberFromText(value) {
  const match = String(value == null ? '' : value).match(/-?\d+/);
  return match ? Number.parseInt(match[0], 10) || 0 : 0;
}

function quantity(count, singular, plural) {
  const value = Number(count) || 0;
  return `${value} ${value === 1 ? singular : (plural || `${singular}s`)}`;
}

function setTextIfChanged(node, text) {
  if (!node) return false;
  const next = String(text == null ? '' : text);
  if (String(node.textContent || '') === next) return false;
  node.textContent = next;
  return true;
}

function readStatCards(section) {
  const map = new Map();
  if (!section) return map;
  for (const card of section.querySelectorAll('.dashboard-stat')) {
    const label = card.querySelector('.dashboard-stat-label');
    const value = card.querySelector('.dashboard-stat-value');
    if (!label || !value) continue;
    map.set(String(label.textContent || '').trim(), { card, label, value });
  }
  return map;
}

function parseWalletMix(meta) {
  const text = String(meta && meta.textContent || '');
  const count = (pattern) => {
    const match = text.match(pattern);
    return match ? Number.parseInt(match[1], 10) || 0 : 0;
  };
  return {
    hardware: count(/(\d+)\s+hardware/i),
    software: count(/(\d+)\s+software/i),
    other: count(/(\d+)\s+other\/custom/i)
  };
}

function buildVaultContentsLabel(counts = {}) {
  const hardware = Number(counts.hardware) || 0;
  const software = Number(counts.software) || 0;
  const other = Number(counts.other) || 0;
  const exchanges = Number(counts.exchanges) || 0;
  const services = Number(counts.services) || 0;
  const walletTotal = Number(counts.walletTotal) || hardware + software + other;
  const total = walletTotal + exchanges + services;

  if (!total) return 'Add a wallet, exchange account, or Web / Web3 service to begin building your vault inventory.';

  const parts = [];
  if (hardware) parts.push(quantity(hardware, 'hardware wallet'));
  if (software) parts.push(quantity(software, 'software wallet'));
  if (other) parts.push(quantity(other, 'custom / other wallet'));
  if (exchanges) parts.push(quantity(exchanges, 'exchange account'));
  if (services) parts.push(quantity(services, 'Web / Web3 service'));

  if (!parts.length && walletTotal) parts.push(quantity(walletTotal, 'wallet'));
  return `Vault contents: ${parts.join(' • ')}`;
}

function patchVaultOverview(root = document) {
  const heading = root.querySelector('.dashboard-header h1');
  if (!heading || String(heading.textContent || '').trim() !== 'Vault Overview') return;

  const intro = root.querySelector('.dashboard-header p');
  setTextIfChanged(intro, 'An at-a-glance view of your Profiles, Vault Items, assets, backups, and recovery health. Vault Items include wallets, exchange accounts, and Web / Web3 services. Everything is calculated locally from your encrypted vault.');

  const section = root.querySelector('.vault-inventory-section');
  if (section) {
    const cards = readStatCards(section);
    const walletCard = cards.get('Wallets') || cards.get('Vault Items');
    const exchangeCard = cards.get('Exchanges');
    const serviceCard = cards.get('Services');
    const exchanges = exchangeCard ? numberFromText(exchangeCard.value.textContent) : 0;
    const services = serviceCard ? numberFromText(serviceCard.value.textContent) : 0;

    let walletTotal = 0;
    if (walletCard) {
      if (!walletCard.card.dataset.safeLedgerWalletCount) {
        walletCard.card.dataset.safeLedgerWalletCount = String(numberFromText(walletCard.value.textContent));
      }
      walletTotal = numberFromText(walletCard.card.dataset.safeLedgerWalletCount);
      setTextIfChanged(walletCard.label, 'Vault Items');
      setTextIfChanged(walletCard.value, String(walletTotal + exchanges + services));
    }

    const meta = section.querySelector('.dashboard-inventory-meta');
    if (meta) {
      if (!meta.dataset.safeLedgerHardwareCount) {
        const mix = parseWalletMix(meta);
        meta.dataset.safeLedgerHardwareCount = String(mix.hardware);
        meta.dataset.safeLedgerSoftwareCount = String(mix.software);
        meta.dataset.safeLedgerOtherCount = String(mix.other);
      }
      const contentsLabel = buildVaultContentsLabel({
        hardware: numberFromText(meta.dataset.safeLedgerHardwareCount),
        software: numberFromText(meta.dataset.safeLedgerSoftwareCount),
        other: numberFromText(meta.dataset.safeLedgerOtherCount),
        walletTotal,
        exchanges,
        services
      });
      setTextIfChanged(meta, contentsLabel);
    }
  }

  for (const helper of root.querySelectorAll('.dashboard-section-help')) {
    if (/click a wallet or vault item/i.test(helper.textContent || '')) {
      setTextIfChanged(helper, 'Click a vault item below to open it and resolve the recovery gaps.');
    }
  }
}

const EXACT_TEXT_REPLACEMENTS = Object.freeze(new Map([
  ['Wallets appear after a Profile is selected.', 'Vault Items appear after a Profile is selected.'],
  ['No wallets yet', 'No vault items yet'],
  ['Add a Wallet to build this Profile recovery plan.', 'Add a Vault Item to build this Profile recovery plan.'],
  ['No matching wallets', 'No matching vault items'],
  ['Try a different wallet search term.', 'Try a different vault-item search term.'],
  ['Create a Profile to organize wallets and recovery plans.', 'Create a Profile to organize vault items, assets, and recovery plans.'],
  ['Search Profiles, Wallets, and Assets without indexing secret values.', 'Search Profiles, Vault Items, and Assets without indexing secret values.'],
  ['No wallet recovery plans have been verified yet.', 'No vault-item recovery plans have been verified yet.'],
  ['Add Wallet', 'Add Vault Item'],
  ['Modify Wallet', 'Modify Vault Item'],
  ['Wallet category', 'Vault item type']
]));

function patchExactText(root = document) {
  const selectors = [
    '.column-empty-title',
    '.column-empty-text',
    '.global-search-header p',
    '.dashboard-empty',
    '#detailArea h1',
    '#detailArea label'
  ];
  for (const node of root.querySelectorAll(selectors.join(','))) {
    const current = String(node.textContent || '').trim();
    if (EXACT_TEXT_REPLACEMENTS.has(current)) setTextIfChanged(node, EXACT_TEXT_REPLACEMENTS.get(current));
  }

  for (const kind of root.querySelectorAll('.global-search-result-kind')) {
    if (String(kind.textContent || '').trim().toUpperCase() === 'WALLET') setTextIfChanged(kind, 'VAULT ITEM');
  }
}

function patchActionLabels(root = document) {
  const replacements = [
    [/^Save wallet$/i, 'Save vault item'],
    [/^Cancel edit wallet$/i, 'Cancel edit vault item'],
    [/^Delete wallet$/i, 'Delete vault item'],
    [/^Confirm delete wallet$/i, 'Confirm delete vault item'],
    [/^Cancel delete wallet$/i, 'Cancel delete vault item'],
    [/^Print wallet$/i, 'Print vault item'],
    [/^Pin wallet$/i, 'Pin vault item'],
    [/^Unpin wallet$/i, 'Unpin vault item']
  ];
  for (const node of root.querySelectorAll('[title], [aria-label]')) {
    for (const attribute of ['title', 'aria-label']) {
      const current = node.getAttribute(attribute);
      if (!current) continue;
      for (const [pattern, replacement] of replacements) {
        if (pattern.test(current)) {
          if (current !== replacement) node.setAttribute(attribute, replacement);
          break;
        }
      }
    }
  }
}

function patchRecoveryDrill(root = document) {
  const title = root.querySelector('.recovery-drill-wallet');
  if (title && /^Wallet:/i.test(title.textContent || '')) {
    setTextIfChanged(title, String(title.textContent).replace(/^Wallet:/i, 'Vault Item:'));
  }
  const warning = root.querySelector('.recovery-drill-warning');
  if (warning) {
    const next = String(warning.textContent || '')
      .replace(/this wallet/gi, 'this vault item')
      .replace(/Edit Wallet/g, 'Edit Vault Item');
    setTextIfChanged(warning, next);
  }
}

function patchRecoveryBinder(root = document) {
  for (const node of root.querySelectorAll('.recovery-binder-summary strong')) {
    const match = String(node.textContent || '').trim().match(/^(\d+)\s+wallet(s)?$/i);
    if (match) {
      const count = Number.parseInt(match[1], 10) || 0;
      setTextIfChanged(node, quantity(count, 'vault item'));
    }
  }
}

function patchRecoveryIntelligenceText(root = document) {
  const section = root.querySelector('#recoveryIntelligenceSection');
  if (!section) return;
  for (const node of section.querySelectorAll('.dashboard-list-title, .dashboard-list-meta, .dashboard-empty')) {
    const current = String(node.textContent || '');
    const next = current
      .replace(/listed Wallet\/Asset locations/g, 'listed Vault Item / Asset locations')
      .replace(/Repeated Wallet recovery metadata/g, 'Repeated Vault Item recovery metadata')
      .replace(/Wallet entries share/g, 'Vault Item entries share');
    setTextIfChanged(node, next);
  }
}

function patch(root = document) {
  patchVaultOverview(root);
  patchExactText(root);
  patchActionLabels(root);
  patchRecoveryDrill(root);
  patchRecoveryBinder(root);
  patchRecoveryIntelligenceText(root);
}

function start() {
  patch(document);
  const observer = new MutationObserver(() => patch(document));
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports._test = {
  numberFromText,
  quantity,
  setTextIfChanged,
  parseWalletMix,
  buildVaultContentsLabel,
  readStatCards,
  patchVaultOverview,
  patchExactText,
  patchActionLabels,
  patchRecoveryDrill,
  patchRecoveryBinder,
  patchRecoveryIntelligenceText
};
