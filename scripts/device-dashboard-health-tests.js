'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const dashboard = fs.readFileSync(path.join(root, 'src/main/dashboard-ui.js'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'src/main/preload.js'), 'utf8');

assert(dashboard.includes("title.textContent = 'Device & Backup Health'"));
assert(dashboard.includes('window.safeLedgerApi.getStorageHealth()'));
assert(dashboard.includes('window.safeLedgerApi.getBackupHealth()'));
assert(dashboard.includes("'Portable storage'"));
assert(dashboard.includes("'Encrypted backup'"));
assert(dashboard.includes("backupHealth.backup.state === 'due'"));
assert(dashboard.includes("backupHealth.verified.state === 'due'"));
assert(!dashboard.includes('serial'));
assert(!dashboard.includes('deviceId'));
assert(!dashboard.includes('volumeId'));
assert(!dashboard.includes('backupPath'));
assert(preload.includes('getStorageHealth'));
assert(preload.includes('getBackupHealth'));

execFileSync(process.execPath, ['--check', path.join(root, 'src/main/dashboard-ui.js')], { stdio: 'pipe' });

console.log('PASS Recovery Dashboard surfaces only sanitized storage and backup-age health.');
