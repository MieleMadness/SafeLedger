'use strict';

const recoveryIntelligenceUi = require('./recovery-intelligence-dashboard-ui');

let loading = false;

async function enhanceVaultOverview() {
  const area = document.getElementById('detailArea');
  if (!area || loading || area.querySelector('#recoveryIntelligenceSection')) return;
  const heading = area.querySelector('.dashboard-header h1');
  if (!heading || String(heading.textContent || '').trim() !== 'Vault Overview') return;
  if (!window.safeLedgerApi || typeof window.safeLedgerApi.getRecoveryIntelligence !== 'function') return;

  loading = true;
  try {
    const result = await window.safeLedgerApi.getRecoveryIntelligence();
    if (!result || result.ok !== true || !result.intelligence) return;
    if (!area.querySelector('.dashboard-header h1')) return;
    const render = recoveryIntelligenceUi && recoveryIntelligenceUi._test && recoveryIntelligenceUi._test.renderIntelligence;
    if (typeof render === 'function') render(area, result.intelligence);
  } catch (_) {
    // Vault Overview remains usable even when optional intelligence cannot load.
  } finally {
    loading = false;
  }
}

function start() {
  const area = document.getElementById('detailArea');
  if (!area || typeof MutationObserver !== 'function') return;
  const observer = new MutationObserver(() => { setTimeout(enhanceVaultOverview, 0); });
  observer.observe(area, { childList: true, subtree: true });
  enhanceVaultOverview();
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports._test = { enhanceVaultOverview };
