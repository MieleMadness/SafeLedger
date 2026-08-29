'use strict';

const { ipcRenderer: ipc } = require('./renderer-bridge');

function createStartupScreen() {
  if (document.getElementById('startupScreen')) return;

  const style = document.createElement('style');
  style.id = 'startupScreenStyle';
  style.textContent = `
    #startupScreen {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0D47A1;
      color: #fff;
      opacity: 1;
      transition: opacity .18s ease;
    }
    #startupScreen.startup-screen-hidden { opacity: 0; pointer-events: none; }
    #startupScreen .startup-card { text-align: center; padding: 28px; }
    #startupScreen .startup-logo { width: 92px; height: 92px; object-fit: contain; display: block; margin: 0 auto 14px; }
    #startupScreen .startup-title { margin: 0 0 7px; font-size: 28px; font-weight: 600; }
    #startupScreen .startup-message { margin: 0; font-size: 13px; opacity: .82; letter-spacing: .02em; }
    #startupScreen .startup-spinner { width: 22px; height: 22px; margin: 16px auto 0; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: safeLedgerSpin .8s linear infinite; }
    @keyframes safeLedgerSpin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);

  const screen = document.createElement('div');
  screen.id = 'startupScreen';
  screen.setAttribute('role', 'status');
  screen.setAttribute('aria-live', 'polite');

  const card = document.createElement('div');
  card.className = 'startup-card';
  const logo = document.createElement('img');
  logo.className = 'startup-logo';
  logo.src = './../../sl.png';
  logo.alt = 'SafeLedger';
  card.appendChild(logo);
  const title = document.createElement('div');
  title.className = 'startup-title';
  title.textContent = 'SafeLedger';
  card.appendChild(title);
  const message = document.createElement('p');
  message.className = 'startup-message';
  message.textContent = 'Opening your secure workspace';
  card.appendChild(message);
  const spinner = document.createElement('div');
  spinner.className = 'startup-spinner';
  spinner.setAttribute('aria-hidden', 'true');
  card.appendChild(spinner);
  screen.appendChild(card);
  document.body.appendChild(screen);
}

function dismissStartupScreen() {
  const screen = document.getElementById('startupScreen');
  if (!screen || screen.classList.contains('startup-screen-hidden')) return;
  screen.classList.add('startup-screen-hidden');
  window.setTimeout(() => {
    if (screen.parentNode) screen.parentNode.removeChild(screen);
    const style = document.getElementById('startupScreenStyle');
    if (style && style.parentNode) style.parentNode.removeChild(style);
  }, 180);
}

createStartupScreen();
ipc.on('result-init-system', dismissStartupScreen);
window.setTimeout(dismissStartupScreen, 8000);

exports.dismiss = dismissStartupScreen;
