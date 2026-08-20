'use strict';

const { ipcRenderer: ipc } = require('electron');

function dismissStartupScreen() {
  const screen = document.getElementById('startupScreen');
  if (!screen || screen.classList.contains('startup-screen-hidden')) return;
  screen.classList.add('startup-screen-hidden');
  window.setTimeout(() => {
    if (screen.parentNode) screen.parentNode.removeChild(screen);
  }, 180);
}

ipc.on('result-init-system', dismissStartupScreen);

window.addEventListener('DOMContentLoaded', () => {
  // If initialization ever fails before responding, do not leave an opaque
  // loading layer over the application's own error/status UI indefinitely.
  window.setTimeout(dismissStartupScreen, 8000);
});
