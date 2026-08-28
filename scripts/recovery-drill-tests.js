'use strict';

const assert = require('assert');
const recoveryDrill = require('../src/main/recovery-drill');

const wallet = {
  seedPhrase: 'twelve secret recovery words must never appear in the drill',
  password: 'wallet-password-secret',
  pin: '4921',
  recoveryLocation: 'fireproof safe in private room',
  recoveryInstructions: 'Use the hardware wallet with the separately stored backup.',
  customFields: [{ label: 'Secret code', type: 'sensitive', value: 'CUSTOM-SECRET-VALUE' }]
};

const steps = recoveryDrill.buildSteps(wallet);
assert.strictEqual(steps.length, 5);
const renderedModel = JSON.stringify(steps);
for (const secret of [wallet.seedPhrase, wallet.password, wallet.pin, wallet.recoveryLocation, wallet.customFields[0].value]) {
  assert(!renderedModel.includes(secret));
}
assert.strictEqual(recoveryDrill.canComplete(wallet), true);
assert.strictEqual(recoveryDrill.canComplete({}), false);

const patch = recoveryDrill.completionPatch(new Date('2026-08-28T12:00:00.000Z'));
assert.deepStrictEqual(patch, {
  lastRecoveryDrill: '2026-08-28T12:00:00.000Z',
  lastVerified: '2026-08-28T12:00:00.000Z'
});
assert.deepStrictEqual(Object.keys(patch).sort(), ['lastRecoveryDrill', 'lastVerified']);
assert.throws(() => recoveryDrill.completionPatch('not-a-date'));
console.log('PASS recovery drill exposes no wallet secrets and stores only completion/verification timestamps.');
