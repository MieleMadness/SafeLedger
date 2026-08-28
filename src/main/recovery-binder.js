'use strict';

const customFields = require('./custom-fields');

const DEFAULT_OPTIONS = Object.freeze({
  includeNotes: false,
  includePublicAddresses: false,
  includeBalances: false,
  includePasswordsPins: false,
  includeSeedPrivateKeys: false,
  includeSensitiveCustomFields: false
});

const PRIVACY_LABELS = Object.freeze({
  includeNotes: 'Notes',
  includePublicAddresses: 'Public addresses',
  includeBalances: 'Balances',
  includePasswordsPins: 'Passwords, PINs, and recovery links',
  includeSeedPrivateKeys: 'Seed phrases and private keys',
  includeSensitiveCustomFields: 'Sensitive custom fields'
});

function text(value) {
  return String(value == null ? '' : value).trim();
}

function normalizeOptions(options = {}) {
  const normalized = {};
  for (const key of Object.keys(DEFAULT_OPTIONS)) normalized[key] = options[key] === true;
  return normalized;
}

function pushField(fields, label, value) {
  const rendered = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : text(value);
  if (rendered) fields.push({ label, value: rendered });
}

function appendCustomFields(fields, sourceFields, options) {
  for (const field of customFields.normalize(sourceFields)) {
    if (field.type === 'sensitive' && !options.includeSensitiveCustomFields) continue;
    pushField(fields, `Custom · ${field.label}`, customFields.displayValue(field));
  }
}

function buildAsset(record = {}, options = {}) {
  const fields = [];
  pushField(fields, 'Coin', record.name);
  pushField(fields, 'Symbol', record.symbol);
  pushField(fields, 'Tags', record.tags);
  if (options.includePublicAddresses) pushField(fields, 'Public address', record.publicAddress);
  if (options.includeBalances) {
    pushField(fields, 'Balance', record.manualBalance);
    pushField(fields, 'Balance updated', record.balanceUpdated);
  }
  if (options.includeSeedPrivateKeys) pushField(fields, 'Private key', record.privateAddress);
  appendCustomFields(fields, record.customFields, options);
  if (options.includeNotes) pushField(fields, 'Notes', record.notes);
  return {
    title: text(record.name) || text(record.symbol) || 'Asset',
    fields
  };
}

function buildWallet(group = {}, options = {}) {
  const fields = [];
  pushField(fields, 'Wallet', group.name);
  pushField(fields, 'Category', group.category);
  pushField(fields, 'Manufacturer', group.manufacturer);
  pushField(fields, 'Model', group.model);
  pushField(fields, 'Purchase / setup date', group.purchaseDate);
  pushField(fields, 'Recovery format', group.recoveryFormat);
  pushField(fields, 'Recovery material storage', group.recoveryStorageMode);
  pushField(fields, 'Recovery material location', group.recoveryLocation);
  pushField(fields, 'Device location', group.deviceLocation);
  pushField(fields, 'Backup location', group.backupLocation);
  pushField(fields, 'Additional passphrase used', group.passphraseUsed);
  pushField(fields, 'Beneficiary / recovery contact', group.beneficiary);
  pushField(fields, 'Recovery instructions', group.recoveryInstructions);
  pushField(fields, 'Last verified', group.lastVerified);
  pushField(fields, 'Last recovery drill', group.lastRecoveryDrill);
  pushField(fields, 'Tags', group.tags);

  if (options.includePasswordsPins) {
    pushField(fields, 'Password', group.password);
    pushField(fields, 'PIN', group.pin);
    pushField(fields, 'Recovery link', group.recoveryLink);
  }
  if (options.includeSeedPrivateKeys) pushField(fields, 'Seed phrase', group.seedPhrase);
  appendCustomFields(fields, group.customFields, options);
  if (options.includeNotes) pushField(fields, 'Notes', group.notes);

  const records = Array.isArray(group.records) ? group.records : [];
  return {
    title: text(group.name) || 'Wallet',
    fields,
    assets: records.map((record) => buildAsset(record, options))
  };
}

function selectedPrivacyLabels(options = {}) {
  const normalized = normalizeOptions(options);
  return Object.keys(PRIVACY_LABELS)
    .filter((key) => normalized[key])
    .map((key) => PRIVACY_LABELS[key]);
}

function buildBinder(profile = {}, vaultData = {}, options = {}, generatedAt = new Date()) {
  const normalizedOptions = normalizeOptions(options);
  const generated = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);
  if (Number.isNaN(generated.getTime())) throw new Error('A valid binder generation date is required.');

  const profileFields = [];
  pushField(profileFields, 'Profile', profile.name);
  pushField(profileFields, 'Created', profile.created);
  pushField(profileFields, 'Modified', profile.modified);

  const groups = Array.isArray(vaultData.groups) ? vaultData.groups : [];
  const wallets = groups.map((group) => buildWallet(group, normalizedOptions));
  return {
    title: `${text(profile.name) || 'SafeLedger'} Recovery Binder`,
    generatedAt: generated.toISOString(),
    profileFields,
    walletCount: wallets.length,
    assetCount: wallets.reduce((count, wallet) => count + wallet.assets.length, 0),
    privacySelections: selectedPrivacyLabels(normalizedOptions),
    wallets
  };
}

module.exports = {
  DEFAULT_OPTIONS,
  PRIVACY_LABELS,
  normalizeOptions,
  selectedPrivacyLabels,
  buildBinder,
  _test: { text, pushField, appendCustomFields, buildAsset, buildWallet }
};
