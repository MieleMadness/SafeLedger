'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createLoginAttemptHandler } = require('../src/main/login-attempt-main');
const settingsManager = require('../src/main/settings-manager');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const now = 1_800_000_000_000;

function fixture(options = {}) {
  const state = {
    settings: Object.assign({
      lockLogin: false, lockLoginTime: 0, minutesToWaitBetweenLockout: 1,
      failAttemptCount: 0, numFailAttempts: 2, lockOutCount: 0,
      numLockoutRetries: 3, scrubContentAfterRetries: false
    }, options.settings || {}),
    verified: 0, recorded: 0, exhausted: 0, cleared: 0, unlocked: false
  };
  const handler = createLoginAttemptHandler({
    now: () => now,
    loadSettings: async () => {
      if (options.failLoad) throw new Error('Sensitive storage failure');
      state.settings = settingsManager._test.normalizeSettings(state.settings, now);
      return Object.assign({}, state.settings);
    },
    verifyPassword: async (password) => {
      state.verified++;
      if (options.verifyError) throw new Error('Verification failed');
      await Promise.resolve(); // exercise interleaved IPC call attempts
      if (password === 'correct') {
        state.unlocked = true;
        return { ok: true, unlocked: true };
      }
      return { ok: false, type: 'password-failed' };
    },
    recordFailure: async () => {
      state.recorded++;
      if (options.failSave) throw new Error('Cannot persist failed attempts');
      state.settings.failAttemptCount++;
      if (state.settings.failAttemptCount >= state.settings.numFailAttempts) {
        state.settings.failAttemptCount = 0;
        state.settings.lockOutCount++;
        state.settings.lockLogin = true;
        state.settings.lockLoginTime = now;
      }
      return { settings: Object.assign({}, state.settings) };
    },
    onExhaustion: async () => {
      state.exhausted++;
      if (options.failExhaustion) throw new Error('Storage unavailable');
      state.unlocked = false;
      state.settings.lockOutCount = Math.max(0, state.settings.numLockoutRetries - 1);
      state.settings.lockLogin = true;
      state.settings.lockLoginTime = now;
    },
    clearSession: () => { state.unlocked = false; state.cleared++; }
  });
  return { handler, state };
}

async function main() {
  const retry = fixture();
  const wrong = await retry.handler('wrong');
  assert.strictEqual(wrong.type, 'password-failed');
  assert.strictEqual(wrong.status, 'ERROR');
  assert.strictEqual(wrong.settings.failAttemptCount, 1);
  assert.strictEqual(retry.state.recorded, 1,
    'One direct login call must persist exactly one failed attempt.');
  assert.strictEqual((await retry.handler('correct')).ok, true);
  assert.strictEqual(retry.state.recorded, 1, 'Successful login must not count as failure.');

  const parallel = fixture();
  const attempted = await Promise.all([
    parallel.handler('bad-1'), parallel.handler('bad-2'), parallel.handler('correct')
  ]);
  assert.deepStrictEqual(attempted.map((entry) => entry.type),
    ['password-failed', 'password-failed', 'locked-out'],
    'Simultaneous IPC attempts must be processed in submission order and cannot bypass a newly reached lockout.');
  assert.strictEqual(parallel.state.verified, 2, 'Active lockout must reject correct and incorrect passwords before KDF work.');
  assert.strictEqual(parallel.state.recorded, 2);
  assert.strictEqual(parallel.state.settings.lockOutCount, 1);
  assert.strictEqual(parallel.state.settings.unlocked, undefined);

  const locked = fixture({ settings: { lockLogin: true, lockLoginTime: now - 20000 } });
  assert.strictEqual((await locked.handler('correct')).type, 'locked-out');
  assert.strictEqual(locked.state.verified, 0);

  const expired = fixture({ settings: { lockLogin: true, lockLoginTime: now - 120000 } });
  assert.strictEqual((await expired.handler('correct')).ok, true,
    'An expired lockout may authenticate after a trusted settings refresh.');

  const exhausted = fixture({ settings: { lockOutCount: 3, numLockoutRetries: 3 } });
  assert.strictEqual((await exhausted.handler('correct')).type, 'locked-out');
  assert.strictEqual(exhausted.state.exhausted, 1);
  assert.strictEqual(exhausted.state.verified, 0, 'Exhausted retry protection must run before password verification.');

  for (const scenario of [{ failSave: true }, { failLoad: true }, { failExhaustion: true }, { verifyError: true }]) {
    const fx = fixture({
      ...scenario,
      settings: scenario.failExhaustion ? { lockOutCount: 3 } : undefined
    });
    const denied = await fx.handler('wrong');
    assert.strictEqual(denied.type, 'security-state-error');
    assert.strictEqual(denied.ok, false);
    assert.strictEqual(fx.state.unlocked, false);
    assert(fx.state.cleared > 0, 'Unable to persist a security transition must clear the active session key.');
  }

  assert.throws(() => createLoginAttemptHandler({}), /trusted loadSettings/);

  const mainSource = read('src/main/main.js');
  const cryptoIpcSource = read('src/main/crypto-session-main.js');
  const preloadSource = read('src/main/preload.js');
  const uiSource = read('src/main/crypto-ui-bridge.js');
  assert(mainSource.includes('createLoginAttemptHandler('), 'Main process must own the serialized password-attempt handler.');
  assert(mainSource.includes('loginAttempt });'), 'Crypto IPC must receive the trusted handler.');
  assert(cryptoIpcSource.includes('return options.loginAttempt(password);'),
    'Direct crypto-v3-login IPC must run accounting; it must not expose raw password verification.');
  assert(!cryptoIpcSource.includes("return getDefaultController().loginWithEnvelope(password);"),
    'Raw envelope verifier must not be directly callable through IPC.');
  assert(cryptoIpcSource.includes("if (!getDefaultController().isUnlocked())"),
    'Change Password must not provide a second password verification oracle while the vault is locked.');
  assert(!mainSource.includes("ipc.on('record-password-failure'"),
    'No standalone failed-attempt IPC listener may remain.');
  for (const source of [preloadSource, uiSource, read('src/main/renderer-services.js')]) {
    assert(!source.includes('record-password-failure') && !source.includes('recordPasswordFailure()'),
      'Renderer must not control a separate failed-attempt IPC operation.');
  }
  assert(uiSource.includes("unlocked.type === 'password-failed'"),
    'Renderer must still restore the login button after a recorded, non-locking wrong password.');
  console.log('PASS main-process login accounting is serialized, lockout-aware, fail-closed and not bypassable through renderer IPC.');
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
