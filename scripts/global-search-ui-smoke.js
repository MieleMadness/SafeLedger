'use strict';

// Isolated Chromium fixture: exercises the real search module without opening
// an encrypted vault or connecting to the production main-process API.
const path = require('path');
if (!process.versions.electron) {
  const { spawnSync } = require('child_process');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const result = spawnSync(require('electron'), [__filename, '--disable-gpu'], {
    env, stdio: 'inherit', timeout: 30000, windowsHide: true
  });
  if (result.error) console.error(result.error.message);
  process.exit(result.status == null ? 1 : result.status);
} else {
  const { app, BrowserWindow } = require('electron');
  app.whenReady().then(async () => {
    const win = new BrowserWindow({ width: 1100, height: 760, show: false,
      webPreferences: { nodeIntegration: true, contextIsolation: false } });
    try {
      await win.loadFile(path.join(__dirname, 'global-search-fixture.html'));
      const result = await win.webContents.executeJavaScript(`(async () => {
        const assert = require('assert');
        const ui = require(${JSON.stringify(path.join(__dirname, '../src/main/global-search-ui.js'))});
        document.body.innerHTML = '<button id="opener">Open search</button>';
        const opener = document.getElementById('opener');
        opener.focus();
        ui.configure({ isUnlocked: () => true });
        const pending = [];
        window.safeLedgerApi = { globalSearch: query => new Promise(resolve => pending.push({query, resolve})) };
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const input = () => document.querySelector('.global-search-input');
        const enter = value => { input().value = value; input().dispatchEvent(new Event('input')); };
        ui.open();
        assert.strictEqual(getComputedStyle(document.querySelector('.global-search-overlay')).position, 'fixed', 'production CSS must load');
        assert.strictEqual(document.activeElement, input());
        assert(input().getAttribute('aria-label'));
        const close = document.querySelector('.global-search-close');
        input().dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true}));
        assert.strictEqual(document.activeElement, close, 'Tab wraps to close when no results');
        close.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', shiftKey: true, bubbles: true, cancelable: true}));
        assert.strictEqual(document.activeElement, input(), 'Shift+Tab wraps back');
        enter('old');
        await wait(130);
        assert.strictEqual(pending.length, 1);
        enter('new');
        pending[0].resolve({ok: true, results: [{type: 'profile', title: 'Stale result'}]});
        await wait(0);
        assert(!document.querySelector('.global-search-result'), 'old reply must not render during debounce');
        await wait(130);
        pending[1].resolve({ok: true, results: [{type: 'profile', title: 'Current result', subtitle: 'Profile'}]});
        await wait(0);
        assert(document.querySelector('.global-search-result').textContent.includes('Current result'));
        assert.strictEqual(document.querySelector('.global-search-results').getAttribute('aria-live'), 'polite');
        close.click();
        assert.strictEqual(document.activeElement, opener, 'close restores invoking focus');
        ui.open(); enter('cancel'); ui.close(); ui.open();
        await wait(130);
        assert.strictEqual(pending.length, 2, 'closed dialog must cancel debounce work');
        ui.close();
        return 'PASS Chromium search: labels, focus wrap/restore, stale response rejection, close/reopen timer cleanup.';
      })()`);
      console.log(result);
      if (process.env.SAFELEDGER_UI_CAPTURE_DIR) {
        const fs = require('fs');
        fs.mkdirSync(process.env.SAFELEDGER_UI_CAPTURE_DIR, { recursive: true });
        for (const width of [1100, 640]) {
          win.setContentSize(width, 760);
          for (const theme of ['light', 'dark', 'colorful']) {
            await win.webContents.executeJavaScript(`(() => {
              document.documentElement.dataset.theme = ${JSON.stringify(theme)};
              document.documentElement.dataset.appearance = ${JSON.stringify(theme)};
              const ui = require(${JSON.stringify(path.join(__dirname, '../src/main/global-search-ui.js'))});
              ui.close(); ui.open();
              ui._test.renderResults(document.querySelector('.global-search-results'), [{
                type: 'profile', title: 'Family recovery profile — ' + 'Long name '.repeat(18),
                subtitle: 'Disposable demonstration record', pinned: true
              }], 'family');
            })()`);
            await new Promise(resolve => setTimeout(resolve, 100));
            const bounds = await win.webContents.executeJavaScript(`(() => {
              const box = document.querySelector('.global-search-panel').getBoundingClientRect();
              return { left: box.left, right: box.right, bottom: box.bottom, width: innerWidth, height: innerHeight };
            })()`);
            if (bounds.left < 0 || bounds.right > bounds.width || bounds.bottom > bounds.height) throw new Error('Search panel overflows viewport');
            fs.writeFileSync(path.join(process.env.SAFELEDGER_UI_CAPTURE_DIR, `search-${theme}-${width}.png`), (await win.webContents.capturePage()).toPNG());
          }
        }
        console.log('PASS search panel fits both viewport widths across three appearances.');
      }
      app.exit(0);
    } catch (err) { console.error(err.stack); app.exit(1); }
  });
}
