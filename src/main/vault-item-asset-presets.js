'use strict';

const walletCatalog = require('./wallet-catalog');
require('./wallet-catalog-extensions');
const tokenIcons = require('./token-icons');

const EXCHANGE_CATEGORY = 'Exchange Account';
const SERVICE_CATEGORY = 'Web3 / Website Account';
const normalize = (value) => String(value || '').trim().toLowerCase();

const EXCHANGE_PRESETS = Object.freeze([
  Object.freeze({
    names: Object.freeze(['Coinbase', 'Coinbase Exchange']),
    source: 'https://help.coinbase.com/en/exchange/crypto-transfers/supported-assets-on-coinbase-exchange',
    assets: Object.freeze([
      ['Bitcoin', 'BTC'], ['Ethereum', 'ETH'], ['USD Coin', 'USDC'], ['Solana', 'SOL'], ['XRP', 'XRP'],
      ['Cardano', 'ADA'], ['Avalanche', 'AVAX'], ['Bitcoin Cash', 'BCH'], ['Dogecoin', 'DOGE'],
      ['Polkadot', 'DOT'], ['Chainlink', 'LINK'], ['Litecoin', 'LTC'], ['Tether', 'USDT']
    ])
  }),
  Object.freeze({
    names: Object.freeze(['Kraken', 'Kraken Exchange']),
    source: 'https://support.kraken.com/articles/360000678446-cryptocurrencies-available-on-kraken',
    assets: Object.freeze([
      ['Bitcoin', 'BTC'], ['Ethereum', 'ETH'], ['Tether', 'USDT'], ['USD Coin', 'USDC'], ['Solana', 'SOL'],
      ['XRP', 'XRP'], ['Cardano', 'ADA'], ['Dogecoin', 'DOGE'], ['Litecoin', 'LTC'], ['Bitcoin Cash', 'BCH'],
      ['Polkadot', 'DOT'], ['Chainlink', 'LINK'], ['Avalanche', 'AVAX']
    ])
  }),
  Object.freeze({
    names: Object.freeze(['Binance']),
    source: 'https://www.binance.com/en/markets/overview',
    assets: Object.freeze([
      ['Bitcoin', 'BTC'], ['Ethereum', 'ETH'], ['BNB', 'BNB'], ['Tether', 'USDT'], ['Solana', 'SOL'],
      ['XRP', 'XRP'], ['Dogecoin', 'DOGE'], ['TRON', 'TRX'], ['Arbitrum', 'ARB'], ['Sui', 'SUI'], ['Chainlink', 'LINK']
    ])
  }),
  Object.freeze({
    names: Object.freeze(['Gemini']),
    source: 'https://www.gemini.com/marketplace',
    assets: Object.freeze([
      ['Bitcoin', 'BTC'], ['Ethereum', 'ETH'], ['Solana', 'SOL'], ['USD Coin', 'USDC'], ['Tether', 'USDT'],
      ['XRP', 'XRP'], ['Bitcoin Cash', 'BCH'], ['Aave', 'AAVE'], ['Avalanche', 'AVAX'], ['Polkadot', 'DOT'],
      ['Arbitrum', 'ARB'], ['Optimism', 'OP']
    ])
  }),
  Object.freeze({
    names: Object.freeze(['Crypto.com']),
    source: 'https://help.crypto.com/en/articles/5978272-which-crypto-can-i-buy-in-the-crypto-com-app-web',
    assets: Object.freeze([
      ['Bitcoin', 'BTC'], ['Ethereum', 'ETH'], ['Tether', 'USDT'], ['XRP', 'XRP'], ['USD Coin', 'USDC'],
      ['Dogecoin', 'DOGE'], ['Bitcoin Cash', 'BCH'], ['Cardano', 'ADA'], ['Chainlink', 'LINK'], ['Litecoin', 'LTC'],
      ['Cronos', 'CRO'], ['Uniswap', 'UNI'], ['Polkadot', 'DOT'], ['Aave', 'AAVE'], ['Algorand', 'ALGO'], ['Filecoin', 'FIL']
    ])
  })
]);

const SERVICE_PRESETS = Object.freeze([
  Object.freeze({
    names: Object.freeze(['FIO App']),
    source: 'https://fio.net/use/fio-app',
    assets: Object.freeze([['FIO Protocol', 'FIO']])
  })
]);

function findPreset(list, name) {
  const key = normalize(name);
  return list.find((preset) => preset.names.some((candidate) => normalize(candidate) === key)) || null;
}

function walletRows(name) {
  const key = normalize(name) === 'coinbase wallet' ? 'base app (coinbase wallet)' : normalize(name);
  const wallet = (walletCatalog.catalog || []).find((entry) => normalize(entry && entry.name) === key);
  if (!wallet) return null;
  return { rows: wallet.records || [], source: wallet.source || '' };
}

function presetRows(name, category) {
  if (category === EXCHANGE_CATEGORY) {
    const preset = findPreset(EXCHANGE_PRESETS, name);
    return preset ? { rows: preset.assets, source: preset.source } : null;
  }
  if (category === SERVICE_CATEGORY) {
    const preset = findPreset(SERVICE_PRESETS, name);
    return preset ? { rows: preset.assets, source: preset.source } : null;
  }
  return walletRows(name);
}

function iconBackedRows(rows) {
  const seen = new Set();
  const result = [];
  for (const row of rows || []) {
    const name = String(row && row[0] || '').trim();
    const symbol = String(row && row[1] || '').trim();
    if (!name || !symbol || !tokenIcons.getIconMatch({ name, symbol })) continue;
    const key = `${normalize(name)}\u0000${symbol.toUpperCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

function buildRecords(name, category, createdAt) {
  const preset = presetRows(name, category);
  if (!preset) return [];
  const created = createdAt ? String(createdAt) : Date();
  return iconBackedRows(preset.rows).map(([assetName, symbol, note]) => ({
    name: assetName,
    symbol,
    created,
    notes: [
      String(note || '').trim(),
      preset.source ? `Preloaded from SafeLedger's reviewed platform support catalog. Availability can vary by region, account, network, or platform update. Source: ${preset.source}` : ''
    ].filter(Boolean).join(' ')
  }));
}

function hasAssetPreset(name, category) {
  return buildRecords(name, category, 'preview').length > 0;
}

module.exports = {
  EXCHANGE_CATEGORY,
  SERVICE_CATEGORY,
  EXCHANGE_PRESETS,
  SERVICE_PRESETS,
  buildRecords,
  hasAssetPreset,
  iconBackedRows,
  _test: { findPreset, walletRows, presetRows, normalize }
};
