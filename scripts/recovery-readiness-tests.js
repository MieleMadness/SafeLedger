'use strict';

const assert = require('assert');
const readiness = require('../src/main/recovery-readiness');
const NOW = Date.UTC(2026, 7, 28, 0, 0, 0);

let result = readiness.calculateWalletReadiness({}, NOW);
assert.strictEqual(result.status, 'Incomplete');
assert.strictEqual(result.score, 0);
result = readiness.calculateWalletReadiness({ recoveryLink: 'documented-offline-process' }, NOW);
assert.strictEqual(result.status, 'Needs Review');
assert.strictEqual(result.score, 55);
result = readiness.calculateWalletReadiness({ recoveryLink: 'documented-offline-process', lastVerified: new Date(NOW - (30 * 24 * 60 * 60 * 1000)).toISOString() }, NOW);
assert.strictEqual(result.status, 'Ready');
assert.strictEqual(result.score, 100);
result = readiness.calculateWalletReadiness({ recoveryLocation: 'Home safe', lastVerified: new Date(NOW - (400 * 24 * 60 * 60 * 1000)).toISOString() }, NOW);
assert.strictEqual(result.status, 'Needs Review');
assert.strictEqual(result.score, 80);
assert.strictEqual(readiness.hasRecoveryPlan({ recoveryLocation: 'Bank box' }), true);
assert.strictEqual(readiness.hasRecoveryPlan({ seedPhrase: '' }), false);
console.log('PASS wallet Recovery Readiness supports documented internal or external recovery plans and annual verification.');
