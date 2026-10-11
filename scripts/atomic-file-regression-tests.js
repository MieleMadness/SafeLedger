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

    // Directory fsync closes its handle on both success and unexpected I/O
    // failure, but falls back on filesystems that cannot sync directories.
    let opens = 0;
    let closes = 0;
    let syncs = 0;
    const fakeIo = {
      open: async () => {
        opens++;
        return { sync: async () => { syncs++; }, close: async () => { closes++; } };
      }
    };
    assert.strictEqual(await atomicFile._test.syncParentDirectory(root, fakeIo, 'linux'), true);
    assert.deepStrictEqual({ opens, syncs, closes }, { opens: 1, syncs: 1, closes: 1 });
    assert.strictEqual(await atomicFile._test.syncParentDirectory(root, fakeIo, 'win32'), false,
      'Windows directory handles must not be treated as portable fsync handles.');
    assert.strictEqual(opens, 1, 'Windows fallback must not open the directory.');

    let unsupportedClosed = false;
    assert.strictEqual(await atomicFile._test.syncParentDirectory(root, {
      open: async () => ({
        sync: async () => { throw Object.assign(new Error('not supported'), { code: 'EINVAL' }); },
        close: async () => { unsupportedClosed = true; }
      })
    }, 'darwin'), false);
    assert.strictEqual(unsupportedClosed, true);

    let failedClosed = false;
    await assert.rejects(atomicFile._test.syncParentDirectory(root, {
      open: async () => ({
        sync: async () => { throw Object.assign(new Error('I/O error'), { code: 'EIO' }); },
        close: async () => { failedClosed = true; }
      })
    }, 'linux'), /I\/O error/);
    assert.strictEqual(failedClosed, true, 'Real sync failures must not be silently ignored.');

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
      ['src/main/settings-manager.js', "require('./atomic-file')"]
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
