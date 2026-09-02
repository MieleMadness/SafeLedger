'use strict';

// Additional reviewed wallet templates layered onto the established SafeLedger
// wallet catalog. Keeping these entries additive avoids duplicating the large
// historical catalog while making them available everywhere the shared catalog
// object is used in the current process.
const walletCatalog = require('./wallet-catalog');

const additions = [
  {
    name: 'Kraken Wallet',
    type: 'Software',
    source: 'https://support.kraken.com/articles/supported-assets-and-networks',
    records: [
      ['Bitcoin', 'BTC'],
      ['Ethereum', 'ETH'],
      ['Arbitrum One', 'ARB'],
      ['Base', 'BASE'],
      ['Optimism', 'OP'],
      ['Polygon', 'POL'],
      ['Solana', 'SOL'],
      ['Dogecoin', 'DOGE'],
      ['Ink', 'INK'],
      ['Blast', 'BLAST'],
      ['Avalanche C-Chain', 'AVAX'],
      ['Linea', 'LINEA'],
      ['ERC-20 / EVM Tokens', 'EVM', 'Kraken Wallet supports tokens on its supported EVM-compatible networks'],
      ['SPL Tokens', 'SPL', 'Kraken Wallet supports Solana SPL tokens']
    ]
  },
  {
    name: 'Backpack',
    type: 'Software',
    source: 'https://learn.backpack.exchange/blog/backpack-wallet-zero-fees-swaps-bridges',
    records: [
      ['Solana', 'SOL'],
      ['Ethereum', 'ETH'],
      ['Base', 'BASE'],
      ['Monad', 'MON'],
      ['Sui', 'SUI'],
      ['Aptos', 'APT'],
      ['BNB Chain', 'BNB'],
      ['Arbitrum', 'ARB'],
      ['Polygon', 'POL'],
      ['Sei', 'SEI'],
      ['Optimism', 'OP'],
      ['Plasma', 'XPL'],
      ['HyperEVM', 'HYPE'],
      ['Berachain', 'BERA'],
      ['Robinhood Chain', 'RHC'],
      ['EVM Tokens', 'EVM', 'Backpack supports tokens across its supported EVM networks'],
      ['SPL Tokens', 'SPL', 'Backpack supports Solana SPL tokens']
    ]
  }
];

const existing = new Set((walletCatalog.catalog || [])
  .map((wallet) => String(wallet && wallet.name || '').trim().toLowerCase())
  .filter(Boolean));

for (const wallet of additions) {
  const key = wallet.name.toLowerCase();
  if (existing.has(key)) continue;
  walletCatalog.catalog.push(wallet);
  existing.add(key);
}

function addReviewedRecord(walletName, record) {
  const wallet = (walletCatalog.catalog || []).find((item) => String(item && item.name || '').trim().toLowerCase() === walletName.toLowerCase());
  if (!wallet || !Array.isArray(wallet.records)) return false;
  const symbol = String(record && record[1] || '').trim().toUpperCase();
  if (!symbol || wallet.records.some((item) => String(item && item[1] || '').trim().toUpperCase() === symbol)) return false;
  wallet.records.push(record);
  return true;
}

// FIO Chain is a native chain and FIO is its only native token. SafeLedger
// adds it only where current FIO documentation explicitly confirms signing or
// token support rather than assuming support from generic multi-chain claims.
addReviewedRecord('Ledger', [
  'FIO Protocol',
  'FIO',
  'Supported through the FIO App with a Ledger hardware wallet. Source: https://fio.net/use/fio-app'
]);
addReviewedRecord('MetaMask', [
  'FIO Protocol',
  'FIO',
  'Supported through the production FIO Wallet Snap for MetaMask. Source: https://dev.fio.net/docs/fio-wallet-snap'
]);

module.exports = additions;
