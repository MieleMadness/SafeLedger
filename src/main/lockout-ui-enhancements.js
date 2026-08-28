'use strict';

const { ipcRenderer: ipc } = require('electron');
const lockoutState = require('./lockout-state');

let countdownTimer = null;
let activeDeadline = 0;
let reloadScheduled = false;

function clearCountdownTimer() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = null;
}

function clearStartupScreen() {
  const screen = document.getElementById('startupScreen');
  if (screen && screen.parentNode) screen.parentNode.removeChild(screen);
  const style = document.getElementById('startupScreenStyle');
  if (style && style.parentNode) style.parentNode.removeChild(style);
}

function formatRemaining(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(Number(milliseconds || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${String(seconds).padStart(2, '0')}s`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function disablePreLoginActions() {
  ['addVault', 'addGroup', 'addRecord'].forEach((id) => {
    const button = document.getElementById(id);
    if (button) button.disabled = true;
  });
  const dock = document.getElementById('detailActionArea');
  if (dock) dock.innerHTML = '';
}

function renderLockout(settings, now = Date.now()) {
  if (!lockoutState.isLockoutActive(settings, now)) {
    clearCountdownTimer();
    activeDeadline = 0;
    return false;
  }

  const deadline = lockoutState.lockoutDeadline(settings);
  clearStartupScreen();
  disablePreLoginActions();

  const area = document.getElementById('detailArea');
  if (!area) return false;

  if (activeDeadline === deadline && document.getElementById('safeLedgerLockoutPanel')) return true;

  clearCountdownTimer();
  activeDeadline = deadline;
  reloadScheduled = false;
  area.classList.remove('wallet-coin-view', 'wallet-coin-edit');
  area.classList.add('safeledger-lockout-view');
  area.innerHTML = '';

  const header = document.createElement('h1');
  header.textContent = 'Login temporarily locked';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));

  const panel = document.createElement('section');
  panel.id = 'safeLedgerLockoutPanel';
  panel.className = 'safeledger-lockout-panel';

  const icon = document.createElement('div');
  icon.className = 'safeledger-lockout-icon';
  icon.innerHTML = '<i class="fa fa-lock" aria-hidden="true"></i>';
  panel.appendChild(icon);

  const message = document.createElement('p');
  message.className = 'safeledger-lockout-message';
  message.textContent = 'Too many incorrect password attempts were entered. SafeLedger has temporarily disabled login according to your Brute Force Protection settings.';
  panel.appendChild(message);

  const countdown = document.createElement('div');
  countdown.id = 'safeLedgerLockoutCountdown';
  countdown.className = 'safeledger-lockout-countdown';
  panel.appendChild(countdown);

  const retryTime = document.createElement('p');
  retryTime.className = 'safeledger-lockout-retry-time';
  retryTime.textContent = `Login available after ${new Date(deadline).toLocaleString()}`;
  panel.appendChild(retryTime);

  const note = document.createElement('p');
  note.className = 'safeledger-lockout-note';
  note.textContent = 'Keep SafeLedger open or close it normally. The remaining lockout time is stored in SafeLedgerData/settings and will continue after a restart.';
  panel.appendChild(note);

  const retryButton = document.createElement('button');
  retryButton.type = 'button';
  retryButton.id = 'safeLedgerLockoutRetry';
  retryButton.className = 'btn btn-default';
  retryButton.disabled = true;
  retryButton.innerHTML = '<i class="fa fa-unlock" aria-hidden="true"></i> Retry Login';
  retryButton.addEventListener('click', () => window.location.reload());
  panel.appendChild(retryButton);
  area.appendChild(panel);

  const updateCountdown = () => {
    const remaining = Math.max(0, deadline - Date.now());
    countdown.textContent = remaining > 0 ? `Try again in ${formatRemaining(remaining)}` : 'Lockout expired';
    if (remaining <= 0) {
      clearCountdownTimer();
      retryButton.disabled = false;
      if (!reloadScheduled) {
        reloadScheduled = true;
        window.setTimeout(() => window.location.reload(), 500);
      }
    }
  };

  updateCountdown();
  countdownTimer = window.setInterval(updateCountdown, 1000);
  return true;
}

function handleSecurityResult(params) {
  if (!params || !params.settings) return false;
  return renderLockout(params.settings);
}

ipc.on('result-init-system', (_event, params) => handleSecurityResult(params));
ipc.on('result', (_event, params) => handleSecurityResult(params));

window.addEventListener('beforeunload', clearCountdownTimer);

module.exports = {
  formatRemaining,
  renderLockout,
  handleSecurityResult,
  clearStartupScreen
};
