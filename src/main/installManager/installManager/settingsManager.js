'use strict';

const fs = require('fs');
const path = require('path');

const defaults = () => ({
  formatVersion: 2,
  created: new Date().toISOString(),
  modified: new Date().toISOString(),
  activationCode: 'FREE',
  failAttemptCount: 0,
  numFailAttempts: 5,
  lockOutCount: 0,
  numLockoutRetries: 5,
  lockLogin: false,
  lockLoginTime: 0,
  minutesToWaitBetweenLockout: 15
});

const settingsPath = (dir) => path.join(dir, 'settings.json');

exports.loadSettings = async (dir) => {
  await fs.promises.mkdir(dir, { recursive: true });
  const file = settingsPath(dir);
  try {
    const parsed = JSON.parse(await fs.promises.readFile(file, 'utf8'));
    return { status: 'SUCCESS', settings: Object.assign(defaults(), parsed, { activationCode: 'FREE' }) };
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    const settings = defaults();
    await exports.saveSettings(dir, settings);
    return { status: 'SUCCESS', settings };
  }
};

exports.saveSettings = async (dir, settings) => {
  await fs.promises.mkdir(dir, { recursive: true });
  const next = Object.assign(defaults(), settings || {}, {
    activationCode: 'FREE',
    modified: new Date().toISOString()
  });
  const file = settingsPath(dir);
  const temp = `${file}.tmp`;
  await fs.promises.writeFile(temp, JSON.stringify(next, null, 2), 'utf8');
  await fs.promises.rename(temp, file);
  return { status: 'SUCCESS', settings: next };
};
