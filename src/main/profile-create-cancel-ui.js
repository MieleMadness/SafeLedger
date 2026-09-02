'use strict';

function isAddProfileScreen() {
  const area = document.getElementById('detailArea');
  const heading = area && area.querySelector('h1');
  return Boolean(heading && String(heading.textContent || '').trim() === 'Add Profile');
}

function goHome() {
  const home = document.getElementById('dashboardButton');
  if (home && typeof home.click === 'function') home.click();
}

function ensureCancelAction() {
  if (!isAddProfileScreen()) return;
  const dock = document.getElementById('detailActionArea');
  if (!dock || dock.querySelector('[data-profile-create-cancel="true"]')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-default detail-action-button detail-action-cancel';
  button.title = 'Cancel new profile';
  button.setAttribute('aria-label', 'Cancel new profile');
  button.dataset.profileCreateCancel = 'true';
  button.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i>';
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    goHome();
  });

  /* Put Cancel before Save so destructive/escape navigation appears first and
   * the primary commit action remains the final action in the form dock. */
  dock.insertBefore(button, dock.firstChild);
}

function start() {
  const addProfile = document.getElementById('addVault');
  if (addProfile) addProfile.addEventListener('click', () => setTimeout(ensureCancelAction, 0));

  const area = document.getElementById('detailArea');
  if (!area || typeof MutationObserver !== 'function') return;
  const observer = new MutationObserver(() => {
    if (isAddProfileScreen()) setTimeout(ensureCancelAction, 0);
  });
  observer.observe(area, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports._test = { isAddProfileScreen, ensureCancelAction, goHome };
