'use strict';

const assert = require('assert');
const readiness = require('../src/main/recovery-readiness');
const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 28, 0, 0, 0);

let result = readiness.calculateWalletReadiness({}, NOW);
assert.strictEqual(result.status, 'Incomplete');
assert.strictEqual(result.score, 0);

result = readiness.calculateWalletReadiness({ recoveryLink: 'documented-offline-process' }, NOW);
assert.strictEqual(result.status, 'Incomplete');
assert.strictEqual(result.score, 25);
assert(result.actions.some((item) => item.id === 'recovery-location'));

const current = new Date(NOW - (30 * DAY_MS)).toISOString();
result = readiness.calculateWalletReadiness({
  recoveryFormat: 'BIP39',
  recoveryLocation: 'Home safe',
  recoveryInstructions: 'Use the documented offline recovery process.',
  lastVerified: current,
  lastRecoveryDrill: current,
  records: []
}, NOW);
assert.strictEqual(result.status, 'Ready');
assert.strictEqual(result.score, 100);
assert.strictEqual(result.actions.length, 0);

const stale = new Date(NOW - (400 * DAY_MS)).toISOString();
result = readiness.calculateWalletReadiness({
  recoveryFormat: 'BIP39',
  recoveryLocation: 'Home safe',
  recoveryInstructions: 'Use the documented offline recovery process.',
  lastVerified: stale,
  lastRecoveryDrill: stale,
  records: []
}, NOW);
assert.strictEqual(result.status, 'Needs Review');
assert.strictEqual(result.score, 78);
assert(result.actions.some((item) => item.id === 'verification'));
assert(result.actions.some((item) => item.id === 'recovery-drill'));

assert.strictEqual(readiness.hasRecoveryPlan({ recoveryLocation: 'Bank box' }), true);
assert.strictEqual(readiness.hasRecoveryPlan({ seedPhrase: '' }), false);
console.log('PASS wallet Recovery Readiness facade reflects the explainable SafeLedger 2.4 Recovery Health model.');
