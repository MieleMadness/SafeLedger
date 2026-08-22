'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const electronPath = require('electron');

const smokeScript = path.join(__dirname, 'electron-crypto-smoke.js');
const result = spawnSync(electronPath, [smokeScript], {
  stdio: 'inherit',
  env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: '1' })
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status == null ? 1 : result.status);
