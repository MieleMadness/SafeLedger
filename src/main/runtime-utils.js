'use strict';

const path = require('path');
const { MAX_MASTER_PASSWORD_LENGTH } = require('./password-policy');

function getPortableRoot(options = {}) {
  const env = options.env || process.env;
  const platform = options.platform || process.platform;
  const execPath = options.execPath || process.execPath;
  if (env.PORTABLE_EXECUTABLE_DIR) return env.PORTABLE_EXECUTABLE_DIR;
  if (platform === 'linux' && env.APPIMAGE) return path.dirname(env.APPIMAGE);
  if (options.isPackaged === false && options.appPath) return options.appPath;
  return path.dirname(execPath);
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
exports.getPortableRoot = getPortableRoot;
exports.formatLockDuration = formatLockDuration;
