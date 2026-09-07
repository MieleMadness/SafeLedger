'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vault = require('../src/main/robust-vault');
const dataWrite = require('../src/main/data-write-service');

(async () => {
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'safeledger-duplicate-assets-'));
  const vaultDir = path.join(temp, 'vaults');
  const key = crypto.randomBytes(32);
  try {
    await fs.promises.mkdir(vaultDir, { recursive: true });
    await vault.initVaultList(vaultDir, key);
    await vault.initVaultData(vaultDir, 'zvault-0.json', key);

    let view = await dataWrite.mutateGroup({
      vault, vaultDir, key,
      request: { type: 'group-create', file: 'zvault-0.json', group: { name: 'Duplicate Test Vault', category: 'Other Wallet' } }
    });
    const groupCreated = view.groups[0].created;

    view = await dataWrite.mutateRecord({
      vault, vaultDir, key,
      request: {
        action: 'create', file: 'zvault-0.json', groupIndex: 0, groupCreated,
        record: { name: 'Bitcoin', symbol: 'BTC', publicAddress: 'bc1q-first' }
      }
    });
    assert.strictEqual(view.groups[0].records.length, 1);

    await assert.rejects(
      () => dataWrite.mutateRecord({
        vault, vaultDir, key,
        request: {
          action: 'create', file: 'zvault-0.json', groupIndex: 0, groupCreated,
          record: { name: 'Bitcoin', symbol: 'BTC', publicAddress: 'bc1q-second' }
        }
      }),
      /matching Asset already exists/i,
      'Authoritative storage must reject an unconfirmed duplicate even if renderer checks are bypassed.'
    );

    view = await dataWrite.mutateRecord({
      vault, vaultDir, key,
      request: {
        action: 'create', file: 'zvault-0.json', groupIndex: 0, groupCreated,
        userConfirmedDuplicate: true,
        record: { name: 'Bitcoin', symbol: 'BTC', publicAddress: 'bc1q-second' }
      }
    });
    assert.strictEqual(view.groups[0].records.filter((item) => item.symbol === 'BTC').length, 2,
      'Explicit confirmation must preserve legitimate intentional duplicate Assets.');

    const btc = view.groups[0].records.find((item) => item.publicAddress === 'bc1q-first');
    const btcIndex = view.groups[0].records.indexOf(btc);
    view = await dataWrite.mutateRecord({
      vault, vaultDir, key,
      request: {
        action: 'modify', file: 'zvault-0.json', groupIndex: 0, groupCreated,
        recordIndex: btcIndex,
        originalRecord: JSON.parse(JSON.stringify(btc)),
        record: Object.assign({}, btc, { publicAddress: 'bc1q-first-updated' })
      }
    });
    assert(view.groups[0].records.some((item) => item.publicAddress === 'bc1q-first-updated'),
      'Editing non-identity information on an already duplicated Asset must not require repeated confirmation.');

    view = await dataWrite.mutateRecord({
      vault, vaultDir, key,
      request: {
        action: 'create', file: 'zvault-0.json', groupIndex: 0, groupCreated,
        record: {
          name: 'USD Coin', symbol: 'USDC',
          customFields: [{ label: 'Network', type: 'text', value: 'Ethereum' }, { label: 'Contract address', type: 'text', value: '0xeth' }]
        }
      }
    });
    view = await dataWrite.mutateRecord({
      vault, vaultDir, key,
      request: {
        action: 'create', file: 'zvault-0.json', groupIndex: 0, groupCreated,
        record: {
          name: 'USD Coin', symbol: 'USDC',
          customFields: [{ label: 'Network', type: 'text', value: 'Polygon' }, { label: 'Contract address', type: 'text', value: '0xpolygon' }]
        }
      }
    });
    assert.strictEqual(view.groups[0].records.filter((item) => item.symbol === 'USDC').length, 2,
      'Same ticker on different networks/contracts must remain valid without duplicate confirmation.');

    const raw = await fs.promises.readFile(path.join(vaultDir, 'zvault-0.json'), 'utf8');
    assert(raw.startsWith('SLG2:'), 'Duplicate protection must not alter authenticated encrypted storage format.');

    console.log('PASS SafeLedger authoritative duplicate protection rejects bypassed duplicate writes, permits explicit duplicates, and preserves multi-network Assets.');
  } finally {
    key.fill(0);
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
