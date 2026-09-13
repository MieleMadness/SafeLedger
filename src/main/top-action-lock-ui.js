'use strict';

const rendererState = require('./renderer-state');
const status = require('./status');

const LOCKED_MESSAGE = 'Please login.';
let onOpenLogin = null;

function configure(options = {}) {
  onOpenLogin = typeof options.onOpenLogin === 'function' ? options.onOpenLogin : null;
}

function showLockedMessage() {
  status.showStatus({ status: 'ERROR', statusMsg: LOCKED_MESSAGE });
}

function openLogin() {
  if (onOpenLogin) return onOpenLogin();
  if (typeof window !== 'undefined' && window.location && typeof window.location.reload === 'function') {
    window.location.reload();
    return;
  }
  showLockedMessage();
}

function guardButton(id, lockedAction) {
  const button = document.getElementById(id);
  if (!button) return;
  button.addEventListener('click', (event) => {
    if (rendererState.isUnlocked()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    lockedAction();
  }, true);
}

function start() {
  guardButton('dashboardButton', openLogin);
  guardButton('activityButton', showLockedMessage);
  guardButton('settingsButton', showLockedMessage);
  guardButton('globalSearchButton', showLockedMessage);
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports.configure = configure;
exports.LOCKED_MESSAGE = LOCKED_MESSAGE;
exports._test = {
  showLockedMessage,
  openLogin,
  guardButton,
  start,
  isUnlocked: () => rendererState.isUnlocked()
};
