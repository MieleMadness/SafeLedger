'use strict';

const web3Icons = require('./web3-icons');

function getIconMatch(record) {
  const item = record || {};
  const name = String(item.name || '').trim();
  const symbol = String(item.symbol || '').trim();
  return web3Icons.matchFirst([
    { category: 'tokens', values: [symbol, name] },
    { category: 'networks', values: [name, symbol] }
  ]);
}

exports.getIconMatch = getIconMatch;

exports.getIconUrl = (record) => {
  const match = getIconMatch(record);
  return match ? match.src : null;
};

exports.createIconElement = (record, className = 'token-brand-image') => {
  const match = getIconMatch(record);
  if (!match) return null;
  const label = record && (record.name || record.symbol) ? (record.name || record.symbol) : 'Web3 asset';
  return web3Icons.createImage(match.src, label, className);
};
