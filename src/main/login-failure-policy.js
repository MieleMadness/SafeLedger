'use strict';

const masterKeyVerifier = require('./master-key-verifier');

exports.classifyVaultListFailure = (failureInput, cryptoKey, settings = {}) => {
  const failure = Object.assign({
    status: 'ERROR',
    statusMsg: 'Unable to read vault list',
    type: 'vault-read-error'
  }, failureInput || {});

  if (failure.type === 'password-or-corrupt') {
    const hasVerifier = !!settings.masterKeyVerifier;
    const correctKey = hasVerifier && masterKeyVerifier.matchesMasterKeyVerifier(cryptoKey, settings.masterKeyVerifier);
    failure.type = correctKey ? 'vault-corrupt' : 'password-failed';
    failure.statusMsg = correctKey
      ? 'Vault list is damaged or incomplete. Your failed-login counter was not changed.'
      : 'Invalid Password';
  }

  return {
    failure,
    countPasswordFailure: failure.type === 'password-failed'
  };
};
