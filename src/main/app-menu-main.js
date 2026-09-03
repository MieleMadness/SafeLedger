'use strict';

/*
 * SafeLedger in-app menu bridge.
 *
 * Windows/Linux native application menus are owned by the operating system and
 * cannot be styled to match SafeLedger's light/dark workspace. On those
 * platforms the renderer uses a small SafeLedger-owned menu bar and this module
 * forwards its commands through a narrow, allow-listed main-process bridge.
 * macOS keeps the native application menu so standard platform conventions are
 * preserved.
 */

const { app, ipcMain, Menu, shell } = require('electron');

const SAFELEDGER_SITE_URL = 'https://safeledger.tnypg.com';
const EDIT_COMMANDS = new Set(['undo', 'redo', 'cut', 'copy', 'paste', 'selectAll']);

function registerIpcHandlers(options = {}) {
  const marker = '__safeLedgerAppMenuIpcRegistered';
  if (global[marker]) return;
  global[marker] = true;

  const getMainWindow = typeof options.getMainWindow === 'function'
    ? options.getMainWindow
    : () => null;

  const assertTrusted = (event) => {
    const win = getMainWindow();
    if (!win || win.isDestroyed() || !event || event.sender !== win.webContents) {
      throw new Error('Untrusted SafeLedger application-menu request.');
    }
    return win;
  };

  const prepareCustomMenu = (event) => {
    const win = assertTrusted(event);
    const customMenu = process.platform !== 'darwin';
    if (customMenu) {
      // Native Windows/Linux menus cannot inherit SafeLedger theme colors.
      // Hide/remove the native menu only after a trusted renderer has loaded.
      Menu.setApplicationMenu(null);
      if (typeof win.setMenuBarVisibility === 'function') win.setMenuBarVisibility(false);
      if (typeof win.setAutoHideMenuBar === 'function') win.setAutoHideMenuBar(true);
    }
    return {
      platform: process.platform,
      version: app.getVersion(),
      customMenu
    };
  };

  ipcMain.handle('app-menu-prepare', prepareCustomMenu);

  ipcMain.on('app-menu-command', (event, rawCommand) => {
    const win = assertTrusted(event);
    const command = String(rawCommand || '');

    if (command === 'version') {
      shell.openExternal(SAFELEDGER_SITE_URL).catch(() => {});
      return;
    }
    if (command === 'settings') {
      win.webContents.send('show-settings');
      return;
    }
    if (command === 'quit') {
      app.quit();
      return;
    }
    if (!EDIT_COMMANDS.has(command)) return;

    const method = win.webContents && win.webContents[command];
    if (typeof method === 'function') method.call(win.webContents);
  });
}

exports.registerIpcHandlers = registerIpcHandlers;
exports._test = { EDIT_COMMANDS, SAFELEDGER_SITE_URL };
