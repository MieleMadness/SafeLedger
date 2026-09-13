'use strict';

const VALID_FOCUS = new Set(['profile', 'vault', 'asset']);

function getShell() {
  return document.querySelector('.app-shell');
}

function setFocus(kind) {
  const shell = getShell();
  if (!shell) return;
  if (VALID_FOCUS.has(kind)) shell.setAttribute('data-column-focus', kind);
  else shell.removeAttribute('data-column-focus');
}

function clearFocus() {
  setFocus(null);
}

function bindColumnClicks() {
  for (const [areaId, kind] of [
    ['vaultArea', 'profile'],
    ['groupArea', 'vault'],
    ['recordArea', 'asset']
  ]) {
    const area = document.getElementById(areaId);
    if (!area) continue;
    area.addEventListener('click', (event) => {
      const target = event.target;
      const link = target && typeof target.closest === 'function' ? target.closest('a') : null;
      if (link && area.contains(link)) setFocus(kind);
    }, true);
  }

  for (const id of ['dashboardButton', 'activityButton', 'settingsButton']) {
    const button = document.getElementById(id);
    if (button) button.addEventListener('click', clearFocus);
  }
}

window.addEventListener('DOMContentLoaded', bindColumnClicks);

module.exports = {
  setFocus,
  clearFocus,
  _test: { VALID_FOCUS }
};
