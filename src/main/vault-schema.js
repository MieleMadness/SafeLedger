'use strict';

const CURRENT_VAULT_SCHEMA_VERSION = 1;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function migrateVaultData(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('SafeLedger vault data has an invalid structure.');
  }

  const data = clone(input);
  const declared = data.schemaVersion == null ? 0 : Number(data.schemaVersion);
  if (!Number.isInteger(declared) || declared < 0) {
    throw new Error('SafeLedger vault schema version is invalid.');
  }
  if (declared > CURRENT_VAULT_SCHEMA_VERSION) {
    throw new Error(`This vault requires a newer SafeLedger data schema (${declared}).`);
  }

  let version = declared;
  if (version < 1) {
    if (!Array.isArray(data.groups)) data.groups = [];
    data.schemaVersion = 1;
    version = 1;
  }

  data.schemaVersion = version;
  return data;
}

function prepareForSave(input) {
  const data = migrateVaultData(input);
  data.schemaVersion = CURRENT_VAULT_SCHEMA_VERSION;
  return data;
}

module.exports = {
  CURRENT_VAULT_SCHEMA_VERSION,
  migrateVaultData,
  prepareForSave,
  _test: { clone }
};
