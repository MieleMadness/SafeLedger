'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const activityHistory = require('../src/main/activity-history');
const securityMain = require('../src/main/security-main');

(async () => {
  assert.strictEqual(activityHistory.MAX_STORED_ENTRIES, 500);
  assert.strictEqual(activityHistory.DEFAULT_READ_LIMIT, 100);
  assert.strictEqual(activityHistory.describe('wallet-updated').label, 'Wallet updated');
  assert.strictEqual(activityHistory.describe('wallet-updated').category, 'data');
  assert.strictEqual(activityHistory.normalizeEvent('wallet-updated'), 'wallet-updated');
  assert.strictEqual(activityHistory.normalizeEvent('wallet-updated\tSECRET-WALLET-NAME'), 'security-event');
  assert.strictEqual(activityHistory.parseLine('2026-08-28T12:00:00.000Z\twallet-updated').event, 'wallet-updated');
  assert.strictEqual(activityHistory.parseLine('2026-08-28T12:00:00.000Z\twallet-updated\tSECRET'), null);
  assert.strictEqual(activityHistory.parseLine('not-a-date\twallet-updated'), null);
  assert.strictEqual(activityHistory.parseLine('2026-08-28T12:00:00.000Z\tunknown-event'), null);

  const raw = [
    activityHistory.serialize('2026-08-28T10:00:00.000Z', 'app-opened'),
    activityHistory.serialize('2026-08-28T11:00:00.000Z', 'recovery-verified'),
    activityHistory.serialize('2026-08-28T12:00:00.000Z', 'recovery-drill-completed')
  ].join('');
  const parsed = activityHistory.parseLog(raw, 2);
  assert.deepStrictEqual(parsed.map((entry) => entry.event), ['recovery-drill-completed', 'recovery-verified']);

  let oversized = '';
  for (let i = 0; i < 520; i++) {
    oversized += activityHistory.serialize(new Date(Date.UTC(2026, 0, 1, 0, 0, 0, i)), 'wallet-updated');
  }
  const compacted = activityHistory.compactLog(oversized);
  const compactedEntries = activityHistory._test.parseChronological(compacted);
  assert.strictEqual(compactedEntries.length, 500);

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'safeledger-activity-'));
  const secret = 'SEED wallet-name balance-address-private-key';
  try {
    await securityMain.audit(temp, `wallet-updated\t${secret}`);
    await securityMain.audit(temp, 'wallet-updated');
    await securityMain.audit(temp, 'recovery-drill-completed');
    const auditPath = path.join(temp, 'settings', 'audit.log');
    const stored = fs.readFileSync(auditPath, 'utf8');
    assert(!stored.includes(secret));
    assert(stored.includes('\tsecurity-event\n'));
    assert(stored.includes('\twallet-updated\n'));
    assert(stored.includes('\trecovery-drill-completed\n'));

    const entries = await securityMain.readActivityHistory(temp, 100);
    assert.deepStrictEqual(entries.map((entry) => entry.event), [
      'recovery-drill-completed',
      'wallet-updated',
      'security-event'
    ]);
    for (const entry of entries) assert.deepStrictEqual(Object.keys(entry).sort(), ['event', 'timestamp']);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }

  const serializedCatalog = JSON.stringify(activityHistory.EVENT_DEFINITIONS);
  for (const forbidden of ['seed phrase', 'private key value', 'wallet address value', 'balance value']) {
    assert(!serializedCatalog.toLowerCase().includes(forbidden));
  }

  console.log('PASS activity history stores only generic event types/timestamps, rejects detail injection, and retains at most 500 events.');
})().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
