'use strict';

const assert = require('assert');
const crypto = require('crypto');
const keyEnvelope = require('../src/main/key-envelope');

async function run() {
  assert(process.versions.electron, 'Smoke test must run inside Electron embedded Node.');

  const password = 'ElectronSmoke9Password!';
  const dataKey = crypto.randomBytes(32);
  const created = await keyEnvelope.createEnvelope(password, dataKey);
  assert.strictEqual(created.envelope.kdf.implementation, 'hash-wasm-argon2id-v1');

  const unlocked = await keyEnvelope.unlockEnvelope(password, created.envelope);
  assert.strictEqual(unlocked.ok, true);
  assert.strictEqual(unlocked.dataKey.toString('hex'), dataKey.toString('hex'));

  const wrong = await keyEnvelope.unlockEnvelope('WrongElectron8Password!', created.envelope);
  assert.strictEqual(wrong.ok, false);
  assert.strictEqual(wrong.type, 'password-failed');

  dataKey.fill(0);
  created.dataKey.fill(0);
  unlocked.dataKey.fill(0);

  console.log(`PASS Electron ${process.versions.electron} / Node ${process.versions.node} Argon2id runtime smoke test.`);
}

run().catch((err) => {
  console.error('ELECTRON CRYPTO SMOKE TEST FAILED');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
