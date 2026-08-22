'use strict';

const detailActions = require('./detail-actions');
const securityUi = require('./security-ui');

const ACTION_ORDER = ['edit', 'print', 'delete'];

function actionKind(title) {
  const value = String(title || '').trim().toLowerCase();
  if (value.startsWith('cancel ')) return 'cancel';
  if (value.startsWith('edit ')) return 'edit';
  if (value.startsWith('print ')) return 'print';
  if (value.includes('delete')) return 'delete';
  if (value.startsWith('save ')) return 'save';
  return 'other';
}

function actionRank(title) {
  const kind = actionKind(title);
  if (kind === 'cancel' || kind === 'save') return 0;
  const index = ACTION_ORDER.indexOf(kind);
  return index === -1 ? 99 : index + 1;
}

function reorderDock() {
  const dock = document.getElementById('detailActionArea');
  if (!dock || dock.children.length < 2) return;
  const current = Array.from(dock.children);
  const sorted = current.slice().sort((a, b) => actionRank(a.title) - actionRank(b.title));
  if (sorted.every((button, index) => button === current[index])) return;
  sorted.forEach((button) => dock.appendChild(button));
}

function hideLegacyButton(button) {
  if (!button) return;
  button.classList.add('profile-legacy-action-hidden');
  button.setAttribute('aria-hidden', 'true');
  button.tabIndex = -1;
}

function deleteConfirmationKind(title) {
  const value = String(title || '').trim();
  if (/^Confirm Delete of coin:/i.test(value)) return 'coin';
  if (/^Confirm Delete of wallet:/i.test(value)) return 'wallet';
  if (/^Confirm delete of profile:/i.test(value)) return 'profile';
  return '';
}

function selectedNavigationLink(kind) {
  if (kind === 'coin') return document.querySelector('#recordArea a.item-selected');
  if (kind === 'wallet') return document.querySelector('#groupArea a.item-selected');
  if (kind === 'profile') {
    const selectedBadge = document.querySelector('#vaultArea .badge-selected');
    return selectedBadge ? selectedBadge.closest('a') : null;
  }
  return null;
}

function removeDeleteCancelAction() {
  const dock = document.getElementById('detailActionArea');
  if (!dock) return;
  const button = dock.querySelector('[data-delete-cancel-action="1"]');
  if (button) button.remove();
}

function ensureDeleteCancelAction(kind) {
  const dock = document.getElementById('detailActionArea');
  if (!dock || !kind) return;

  let button = dock.querySelector('[data-delete-cancel-action="1"]');
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-default detail-action-button detail-action-cancel';
    button.dataset.deleteCancelAction = '1';
    button.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i>';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentKind = button.dataset.deleteKind || '';
      const link = selectedNavigationLink(currentKind);
      if (link) link.click();
    });
  }

  button.dataset.deleteKind = kind;
  button.title = `Cancel delete ${kind}`;
  button.setAttribute('aria-label', `Cancel delete ${kind}`);
  if (dock.firstElementChild !== button) dock.insertBefore(button, dock.firstChild);
}

function getProfileField(area, label) {
  const prefix = `${label}:`;
  const line = Array.from(area.querySelectorAll('p.dates')).find((item) =>
    String(item.textContent || '').trim().toLowerCase().startsWith(prefix.toLowerCase())
  );
  if (!line) return '';
  return String(line.textContent || '').trim().slice(prefix.length).trim();
}

function printProfile(area) {
  const header = area.querySelector('h1');
  const name = header ? String(header.textContent || '').trim() : 'Profile';
  securityUi.printRecoverySheet(`${name} Profile`, [
    { label: 'Profile', value: name },
    { label: 'Created', value: getProfileField(area, 'Created') },
    { label: 'Modified', value: getProfileField(area, 'Modified') },
    { label: 'Location', value: getProfileField(area, 'Location') }
  ], false);
}

function enhanceProfileActions() {
  const area = document.getElementById('detailArea');
  if (!area) return;
  const header = area.querySelector('h1');
  if (!header) {
    removeDeleteCancelAction();
    reorderDock();
    return;
  }

  const title = String(header.textContent || '').trim();
  const confirmKind = deleteConfirmationKind(title);
  if (!confirmKind) removeDeleteCancelAction();

  const saveButton = area.querySelector('form #saveBtn');
  const editButton = area.querySelector('#editBtn');
  const deleteButton = area.querySelector('#deleteBtn');
  let mode = '';

  if ((title === 'Modify Profile' || title === 'Add Profile') && saveButton) mode = 'profile-edit';
  else if (/^Confirm delete of profile:/i.test(title) && deleteButton) mode = 'profile-confirm-delete';
  else if (editButton && deleteButton) mode = 'profile-view';

  if (!mode) {
    if (confirmKind) ensureDeleteCancelAction(confirmKind);
    reorderDock();
    return;
  }

  if (area._safeLedgerProfileHeader === header && area._safeLedgerProfileMode === mode) {
    if (confirmKind) ensureDeleteCancelAction(confirmKind);
    reorderDock();
    return;
  }
  area._safeLedgerProfileHeader = header;
  area._safeLedgerProfileMode = mode;

  if (mode === 'profile-edit') {
    hideLegacyButton(saveButton);
    detailActions.set([
      {
        icon: 'fa-save',
        title: 'Save profile',
        className: 'detail-action-save',
        onClick: () => saveButton.click()
      }
    ]);
    return;
  }

  if (mode === 'profile-confirm-delete') {
    hideLegacyButton(deleteButton);
    detailActions.set([
      {
        icon: 'fa-trash',
        title: 'Confirm delete profile',
        className: 'detail-action-delete',
        onClick: () => deleteButton.click()
      }
    ]);
    ensureDeleteCancelAction('profile');
    reorderDock();
    return;
  }

  hideLegacyButton(editButton);
  hideLegacyButton(deleteButton);
  detailActions.set([
    { icon: 'fa-pencil', title: 'Edit profile', onClick: () => editButton.click() },
    { icon: 'fa-print', title: 'Print profile', className: 'detail-action-print', onClick: () => printProfile(area) },
    { icon: 'fa-trash', title: 'Delete profile', className: 'detail-action-delete', onClick: () => deleteButton.click() }
  ]);
  reorderDock();
}

function install() {
  const detail = document.getElementById('detailArea');
  const dock = document.getElementById('detailActionArea');
  if (!detail || !dock) return;
  const update = () => queueMicrotask(enhanceProfileActions);
  const detailObserver = new MutationObserver(update);
  const dockObserver = new MutationObserver(() => queueMicrotask(enhanceProfileActions));
  detailObserver.observe(detail, { childList: true, subtree: true });
  dockObserver.observe(dock, { childList: true });
  enhanceProfileActions();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', install, { once: true });
} else {
  install();
}

exports._test = { ACTION_ORDER, actionKind, actionRank, deleteConfirmationKind };
