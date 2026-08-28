'use strict';

const recoveryReadiness = require('./recovery-readiness');

const STEPS = Object.freeze([
  Object.freeze({
    id: 'access-point',
    title: 'Locate the wallet or access point',
    text: 'I can locate the wallet, device, or account access point I would need during recovery.'
  }),
  Object.freeze({
    id: 'recovery-material',
    title: 'Locate recovery material',
    text: 'I can locate the recovery material itself or the documented place where it is securely stored.'
  }),
  Object.freeze({
    id: 'backup-condition',
    title: 'Check backup condition',
    text: 'I confirmed the recovery material is readable and intact without entering or copying it into SafeLedger.'
  }),
  Object.freeze({
    id: 'required-credentials',
    title: 'Confirm required credentials',
    text: 'I know where any required PIN, password, or additional passphrase is documented without revealing it here.'
  }),
  Object.freeze({
    id: 'instructions',
    title: 'Review recovery instructions',
    text: 'I reviewed the recovery instructions and they are clear enough to follow during an emergency.'
  })
]);

function buildSteps() {
  return STEPS.map((step) => ({ ...step }));
}

function canComplete(group = {}) {
  return recoveryReadiness.hasRecoveryPlan(group);
}

function completionPatch(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(date.getTime())) throw new Error('A valid recovery drill completion date is required.');
  const completedAt = date.toISOString();
  return {
    lastRecoveryDrill: completedAt,
    lastVerified: completedAt
  };
}

exports.STEPS = STEPS;
exports.buildSteps = buildSteps;
exports.canComplete = canComplete;
exports.completionPatch = completionPatch;
