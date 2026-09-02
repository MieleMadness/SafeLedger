'use strict';

const fs = require('fs');
const path = require('path');
const { MAX_MASTER_PASSWORD_LENGTH } = require('./password-policy');

function findMacAppBundle(execPath) {
  let cursor = path.resolve(String(execPath || ''));
  while (cursor && cursor !== path.dirname(cursor)) {
    if (path.extname(cursor).toLowerCase() === '.app') return cursor;
    cursor = path.dirname(cursor);
  }
  return null;
}

function isMacAppTranslocated(value) {
  return /(^|[\\/])AppTranslocation([\\/]|$)/i.test(String(value || ''));
}

function getPortableRoot(options = {}) {
  const env = options.env || process.env;
  const platform = options.platform || process.platform;
  const execPath = options.execPath || process.execPath;
  if (env.PORTABLE_EXECUTABLE_DIR) return env.PORTABLE_EXECUTABLE_DIR;
  if (platform === 'linux' && env.APPIMAGE) return path.dirname(env.APPIMAGE);
  if (options.isPackaged === false && options.appPath) return options.appPath;
  if (platform === 'darwin') {
    const bundle = findMacAppBundle(execPath);
    if (bundle) return path.dirname(bundle);
  }
  return path.dirname(execPath);
}

function inspectPortableRoot(options = {}) {
  const platform = options.platform || process.platform;
  const execPath = options.execPath || process.execPath;
  const root = getPortableRoot(options);
  const translocated = platform === 'darwin' && isMacAppTranslocated(execPath);
  let writable = null;

  if (options.checkWritable !== false) {
    const fsImpl = options.fs || fs;
    try {
      fsImpl.accessSync(root, fs.constants.W_OK);
      writable = true;
    } catch (_) {
      writable = false;
    }
  }

  return Object.freeze({
    platform,
    root,
    translocated,
    writable,
    safeForPortableData: translocated === false && writable !== false
  });
}

function formatLockDuration(value) {
  const total = Math.max(0, Number.parseInt(value, 10) || 0);
  if (total < 60) return `${total} minute${total === 1 ? '' : 's'}`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const hourText = `${hours} hour${hours === 1 ? '' : 's'}`;
  return minutes ? `${hourText} ${minutes} minute${minutes === 1 ? '' : 's'}` : hourText;
}

exports.MAX_MASTER_PASSWORD_LENGTH = MAX_MASTER_PASSWORD_LENGTH;
exports.findMacAppBundle = findMacAppBundle;
exports.isMacAppTranslocated = isMacAppTranslocated;
exports.getPortableRoot = getPortableRoot;
exports.inspectPortableRoot = inspectPortableRoot;
exports.formatLockDuration = formatLockDuration;
