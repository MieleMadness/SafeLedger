'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const cryptoSession = require('../src/main/crypto-session-main');
const sessionLock = require('../src/main/session-lock-main');
const deviceSecurity = require('../src/main/device-security-main');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function luminance(hex) {
  const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4));
  return (0.2126 * rgb[0]) + (0.7152 * rgb[1]) + (0.0722 * rgb[2]);
}

function contrast(a, b) {
  const first = luminance(a);
  const second = luminance(b);
  const high = Math.max(first, second);
  const low = Math.min(first, second);
  return (high + 0.05) / (low + 0.05);
}

function cssVar(block, name) {
  const match = block.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})`));
  assert(match, `Missing CSS token ${name}`);
  return match[1];
}

async function testRepeatedSameProcessRelogin() {
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'safeledger-2.5.1-relogin-'));
  const vaultDir = path.join(temp, 'vaults');
  const password = 'SafeLedgerRelogin9!';
  const controller = cryptoSession.createController(vaultDir);
  const lockController = sessionLock.createSessionLockController({
    cryptoSession: controller,
    getMainWindow: () => null
  });

  try {
    const initialized = await controller.initializeSession(password);
    assert.strictEqual(initialized.ok, true);
    let generation = controller.getSessionGeneration();
    assert(generation >= 1);

    for (let cycle = 0; cycle < 5; cycle++) {
      const heldKey = controller.getSessionKey();
      assert(Buffer.isBuffer(heldKey));
      lockController.lockSession('emergency-lock');
      assert.strictEqual(controller.isUnlocked(), false);
      assert.strictEqual(controller.getSessionKey(), null);
      assert(heldKey.every((byte) => byte === 0), 'lock must zero the prior DEK before re-login');

      const login = await controller.loginWithEnvelope(password);
      assert.strictEqual(login.ok, true, `same correct password must re-authenticate on cycle ${cycle + 1}`);
      assert.strictEqual(controller.isUnlocked(), true);
      assert(controller.getSessionGeneration() > generation, 'fresh authentication must establish a new session generation');
      generation = controller.getSessionGeneration();
    }
  } finally {
    controller.clearSession();
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

async function testStaleOsSignalsCannotKillFreshSession() {
  const temp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'safeledger-2.5.1-device-'));
  try {
    const powerMonitor = new EventEmitter();
    let idleState = 'active';
    powerMonitor.getSystemIdleState = () => idleState;
    let unlocked = true;
    let generation = 1;
    const locks = [];
    const lockController = {
      isUnlocked: () => unlocked,
      getSessionGeneration: () => generation,
      lockSession: (reason) => {
        locks.push(reason);
        unlocked = false;
      }
    };
    const intervals = [];
    const service = deviceSecurity.createDeviceSecurityService({
      powerMonitor,
      lockController,
      getDataRoot: () => temp,
      setIntervalFn: (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; },
      clearIntervalFn: () => {}
    });

    await service.start();
    assert.strictEqual(service.getLastIdleState(), 'active');

    idleState = 'locked';
    service.checkIdleState();
    assert.deepStrictEqual(locks, ['idle-state']);

    // Simulate a successful same-process re-login while the OS still reports
    // the previous locked state for one more poll. That stale level must not
    // destroy the new session.
    unlocked = true;
    generation++;
    service.checkIdleState();
    assert.deepStrictEqual(locks, ['idle-state']);

    idleState = 'active';
    service.checkIdleState();
    idleState = 'locked';
    service.checkIdleState();
    assert.deepStrictEqual(locks, ['idle-state', 'idle-state']);

    // A suspend lock records the old session generation. If a late resume
    // signal arrives after a new authentication, it must not lock that new
    // generation.
    idleState = 'active';
    service.checkIdleState();
    unlocked = true;
    generation++;
    powerMonitor.emit('suspend');
    assert.strictEqual(locks.at(-1), 'suspend');
    const countAfterSuspend = locks.length;
    unlocked = true;
    generation++;
    powerMonitor.emit('resume');
    assert.strictEqual(locks.length, countAfterSuspend, 'late resume must not destroy a post-suspend re-login');

    // Resume remains fail-closed if there was no observed suspend event.
    unlocked = true;
    powerMonitor.emit('resume');
    assert.strictEqual(locks.at(-1), 'resume');

    service.stop();
  } finally {
    await fs.promises.rm(temp, { recursive: true, force: true });
  }
}

function testTrustedFolderAction() {
  const preload = read('src/main/preload.js');
  const bridge = read('src/main/renderer-bridge.js');
  const bootstrap = read('src/main/bootstrap.js');
  const dashboard = read('src/main/dashboard-ui.js');
  const icons = read('src/main/css/local-icons.css');

  assert(preload.includes("openDataFolder: () => ipcRenderer.invoke('device-open-data-folder')"));
  assert(bridge.includes("'device-open-data-folder': 'openDataFolder'"));
  assert(bootstrap.includes("ipc.handle('device-open-data-folder'"));
  assert(bootstrap.includes('shell.openPath(getDataRoot())'));
  assert(!bootstrap.includes("shell.openPath(event"), 'renderer event data must never select the opened path');
  assert(dashboard.includes('Open SafeLedgerData folder'));
  assert(dashboard.includes('dashboard-title-action'));
  assert(dashboard.includes('fa-external-link'));
  assert(!dashboard.includes('dashboard-status-action'), 'health pills must remain status-only, not clickable controls');
  assert(dashboard.includes('window.safeLedgerApi.openDataFolder()'));
  assert(icons.includes('.fa-external-link'));
}

function testSemanticContrast() {
  const css = read('src/main/css/ui-polish.css');
  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  const darkBlock = css.match(/html\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
  assert(rootBlock && darkBlock, 'light and dark semantic token blocks must exist');

  for (const block of [rootBlock[1], darkBlock[1]]) {
    for (const kind of ['success', 'warning', 'danger']) {
      const fg = cssVar(block, `--sl-status-${kind}-text`);
      const bg = cssVar(block, `--sl-status-${kind}-bg`);
      assert(contrast(fg, bg) >= 4.5, `${kind} status text must meet WCAG normal-text contrast`);
    }
  }

  assert(css.includes('#detailArea .btn-default'));
  assert(css.includes('.dashboard-title-action:focus-visible'));
  assert(css.includes('font-size: 11px !important;'), 'status pills must share the Portable Storage pill text size');
  assert(css.includes('font-weight: 700 !important;'), 'status pill text must remain bold');
  assert(css.includes('#loginBtn .fa'), 'Login icon spacing must remain part of the 2.5.1 UI polish');
}

function testVersion() {
  const pkg = JSON.parse(read('package.json'));
  assert.strictEqual(pkg.version, '2.5.1');
}

(async () => {
  await testRepeatedSameProcessRelogin();
  await testStaleOsSignalsCannotKillFreshSession();
  testTrustedFolderAction();
  testSemanticContrast();
  testVersion();
  console.log('PASS SafeLedger 2.5.1 same-process re-login, stale OS signal protection, accessible semantic controls, and trusted SafeLedgerData folder action.');
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
