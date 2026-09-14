'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const cryptoSession = require('../src/main/crypto-session-main');
const passwordPolicy = require('../src/main/password-policy');
const sessionLock = require('../src/main/session-lock-main');
const workspaceNavigation = require('../src/main/workspace-navigation-ui');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function testDetailScrollReset() {
  const scrollOwner = { scrollTop: 486 };
  const detailArea = {
    closest(selector) {
      return selector === '.content-middle' ? scrollOwner : null;
    }
  };
  const listeners = {};
  const link = {};
  const navigationArea = {
    dataset: {},
    addEventListener(type, handler) { listeners[type] = handler; },
    contains(candidate) { return candidate === link; }
  };
  const doc = {
    getElementById(id) {
      if (id === 'detailArea') return detailArea;
      if (id === 'vaultArea') return navigationArea;
      return null;
    }
  };

  assert.strictEqual(workspaceNavigation.resetDetailScroll(doc), true);
  assert.strictEqual(scrollOwner.scrollTop, 0, 'the scroll-owning detail column must reset to the top');

  scrollOwner.scrollTop = 321;
  workspaceNavigation.install(doc);
  assert.strictEqual(typeof listeners.click, 'function', 'Profile navigation should install one delegated scroll-reset owner');
  listeners.click({
    target: {
      closest(selector) { return selector === 'a' ? link : null; }
    }
  });
  assert.strictEqual(scrollOwner.scrollTop, 0, 'selecting a navigation row must reset the detail display to the top');

  const entry = read('src/main/renderer-entry.js');
  assert(entry.includes("require('./workspace-navigation-ui.js');"), 'renderer startup must include the navigation scroll owner');
}

async function testRepeatedSameProcessRelogin() {
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'safeledger-2.6.104-relogin-'));
  const vaultDir = path.join(temp, 'vaults');
  // Deliberately represents an existing password that does not satisfy the
  // current new-password composition policy. Existing encrypted data must be
  // authenticated by its envelope, not rejected by a newer creation policy.
  const existingPassword = 'legacy-password-9';
  const controller = cryptoSession.createController(vaultDir);
  const lockController = sessionLock.createSessionLockController({
    cryptoSession: controller,
    getMainWindow: () => null
  });

  try {
    assert(passwordPolicy.validatePassword(existingPassword), 'fixture should fail the new-password composition policy');
    assert.strictEqual(passwordPolicy.validateExistingPassword(existingPassword), '', 'existing-password login should accept the exact non-empty password for envelope verification');

    const initialized = await controller.initializeSession(existingPassword);
    assert.strictEqual(initialized.ok, true);
    let generation = controller.getSessionGeneration();

    for (let cycle = 0; cycle < 5; cycle++) {
      const heldKey = controller.getSessionKey();
      assert(Buffer.isBuffer(heldKey));
      lockController.lockSession('emergency-lock');
      assert.strictEqual(controller.isUnlocked(), false);
      assert.strictEqual(controller.getSessionKey(), null);
      assert(heldKey.every((byte) => byte === 0), 'lock must zero the previous DEK before re-login');

      const login = await controller.loginWithEnvelope(existingPassword);
      assert.strictEqual(login.ok, true, `the same correct password must re-authenticate after lock cycle ${cycle + 1}`);
      assert.strictEqual(controller.isUnlocked(), true);
      assert(controller.getSessionGeneration() > generation, 'successful re-login must establish a fresh session generation');
      generation = controller.getSessionGeneration();
    }

    const cryptoUi = read('src/main/crypto-ui-bridge.js');
    assert(cryptoUi.includes('passwordPolicy.validateExistingPassword(password)'), 'Login must validate an existing password separately from new-password policy');
    assert(cryptoUi.includes('passwordPolicy.validatePassword(password)'), 'first-time initialization must retain the strong new-password policy');
  } finally {
    controller.clearSession();
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

(async () => {
  testDetailScrollReset();
  await testRepeatedSameProcessRelogin();
  console.log('PASS navigation resets the detail scroll owner and repeated lock/re-login authenticates existing passwords without weakening new-password policy.');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
