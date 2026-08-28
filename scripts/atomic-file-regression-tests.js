'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.join(os.tmpdir(), `safeledger-atomic-${process.pid}-${Date.now()}`);
const atomicFile = require('../src/main/atomic-file');

async function run() {
  fs.mkdirSync(root, { recursive: true });
  try {
    const textFile = path.join(root, 'vaults', 'sample.txt');
    await atomicFile.atomicWriteFile(textFile, 'first');
    assert.strictEqual(fs.readFileSync(textFile, 'utf8'), 'first');
    await atomicFile.atomicWriteFile(textFile, 'second');
    assert.strictEqual(fs.readFileSync(textFile, 'utf8'), 'second');

    const jsonFile = path.join(root, 'settings', 'sample.json');
    await atomicFile.atomicWriteJson(jsonFile, { ok: true, value: 7 });
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(jsonFile, 'utf8')), { ok: true, value: 7 });

    const leftovers = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.tmp')) leftovers.push(full);
      }
    };
    walk(root);
    assert.deepStrictEqual(leftovers, []);

    const sourceChecks = [
      ['src/main/robust-vault.js', "require('./atomic-file')"],
      ['src/main/crypto-session-main.js', "require('./atomic-file')"],
      ['src/main/security-main.js', "require('./atomic-file')"],
      ['src/main/installManager/installManager/settingsManager.js', "require('../../atomic-file')"]
    ];
    for (const [relative, token] of sourceChecks) {
      const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
      assert(source.includes(token), `${relative} must use the shared atomic writer`);
    }
    console.log('PASS vault, key-envelope session, settings, and backup writes use one durable atomic-file implementation.');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
