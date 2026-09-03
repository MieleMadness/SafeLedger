'use strict';

/*
 * SafeLedger-owned application menu for Windows/Linux.
 *
 * Native menu bars on those platforms cannot inherit the app's light/dark
 * palette. This renderer menu keeps the familiar SafeLedger/Edit structure,
 * while command execution remains behind the trusted preload/main-process
 * bridge. macOS keeps its native application menu.
 */

function closeMenus(doc = document) {
  doc.querySelectorAll('.app-menu-group.is-open').forEach((group) => {
    group.classList.remove('is-open');
    const button = group.querySelector('.app-menu-trigger');
    if (button) button.setAttribute('aria-expanded', 'false');
  });
}

function makeItem(doc, item) {
  if (item.separator) {
    const separator = doc.createElement('div');
    separator.className = 'app-menu-separator';
    separator.setAttribute('role', 'separator');
    return separator;
  }

  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'app-menu-item';
  button.setAttribute('role', 'menuitem');
  button.dataset.command = item.command;

  const label = doc.createElement('span');
  label.className = 'app-menu-label';
  label.textContent = item.label;
  button.appendChild(label);

  if (item.shortcut) {
    const shortcut = doc.createElement('span');
    shortcut.className = 'app-menu-shortcut';
    shortcut.textContent = item.shortcut;
    button.appendChild(shortcut);
  }
  return button;
}

function makeGroup(doc, label, items) {
  const group = doc.createElement('div');
  group.className = 'app-menu-group';

  const trigger = doc.createElement('button');
  trigger.type = 'button';
  trigger.className = 'app-menu-trigger';
  trigger.textContent = label;
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');

  const menu = doc.createElement('div');
  menu.className = 'app-menu-dropdown';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', `${label} menu`);
  items.forEach((item) => menu.appendChild(makeItem(doc, item)));

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const opening = !group.classList.contains('is-open');
    closeMenus(doc);
    if (opening) {
      group.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });

  trigger.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    if (!group.classList.contains('is-open')) trigger.click();
    const first = menu.querySelector('.app-menu-item');
    if (first) first.focus();
  });

  group.appendChild(trigger);
  group.appendChild(menu);
  return group;
}

function buildMenuBar(doc, version) {
  let bar = doc.getElementById('appMenuBar');
  if (bar) {
    const versionLabel = bar.querySelector('[data-command="version"] .app-menu-label');
    if (versionLabel) versionLabel.textContent = `Version ${version}`;
    return bar;
  }

  bar = doc.createElement('div');
  bar.id = 'appMenuBar';
  bar.className = 'app-menu-bar';
  bar.setAttribute('role', 'menubar');
  bar.setAttribute('aria-label', 'SafeLedger application menu');

  bar.appendChild(makeGroup(doc, 'SafeLedger', [
    { label: `Version ${version}`, command: 'version' },
    { label: 'Settings', command: 'settings' },
    { separator: true },
    { label: 'Quit', command: 'quit', shortcut: 'Alt+F4' }
  ]));

  bar.appendChild(makeGroup(doc, 'Edit', [
    { label: 'Undo', command: 'undo', shortcut: 'Ctrl+Z' },
    { label: 'Redo', command: 'redo', shortcut: 'Ctrl+Y' },
    { separator: true },
    { label: 'Cut', command: 'cut', shortcut: 'Ctrl+X' },
    { label: 'Copy', command: 'copy', shortcut: 'Ctrl+C' },
    { label: 'Paste', command: 'paste', shortcut: 'Ctrl+V' },
    { label: 'Select All', command: 'selectAll', shortcut: 'Ctrl+A' }
  ]));

  const searchArea = doc.getElementById('searchArea');
  const shell = doc.querySelector('.app-shell');
  if (shell && searchArea) shell.insertBefore(bar, searchArea);

  bar.addEventListener('click', (event) => {
    const item = event.target.closest && event.target.closest('.app-menu-item');
    if (!item || !item.dataset.command) return;
    event.preventDefault();
    event.stopPropagation();
    if (window.safeLedgerApi && typeof window.safeLedgerApi.appMenuCommand === 'function') {
      window.safeLedgerApi.appMenuCommand(item.dataset.command);
    }
    closeMenus(doc);
  });

  return bar;
}

async function prepareMenu(doc = document) {
  if (!window.safeLedgerApi || typeof window.safeLedgerApi.prepareAppMenu !== 'function') return null;
  try {
    const info = await window.safeLedgerApi.prepareAppMenu();
    const existing = doc.getElementById('appMenuBar');
    if (!info || info.customMenu !== true) {
      if (existing) existing.remove();
      return info || null;
    }
    return buildMenuBar(doc, info.version || '');
  } catch (_) {
    return null;
  }
}

function start() {
  prepareMenu(document);

  document.addEventListener('click', () => closeMenus(document));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenus(document);
  });

  if (window.safeLedgerApi) {
    if (typeof window.safeLedgerApi.onInitSystem === 'function') {
      window.safeLedgerApi.onInitSystem(() => prepareMenu(document));
    }
    if (typeof window.safeLedgerApi.onSaveSettings === 'function') {
      window.safeLedgerApi.onSaveSettings(() => prepareMenu(document));
    }
  }
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports._test = { closeMenus, makeItem, makeGroup, buildMenuBar };
