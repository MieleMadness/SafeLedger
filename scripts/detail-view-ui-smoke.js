'use strict';

const path = require('path');
if (!process.versions.electron) {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const result = require('child_process').spawnSync(require('electron'), [__filename, '--disable-gpu'], {
    env, stdio: 'inherit', timeout: 30000, windowsHide: true
  });
  if (result.error) console.error(result.error.message);
  process.exit(result.status == null ? 1 : result.status);
} else {
  const { app, BrowserWindow } = require('electron');
  app.whenReady().then(async () => {
    const win = new BrowserWindow({width: 1100, height: 760, show: false,
      webPreferences: {nodeIntegration: true, contextIsolation: false}});
    try {
      await win.loadFile(path.join(__dirname, 'global-search-fixture.html'));
      console.log(await win.webContents.executeJavaScript(`(async () => {
        const assert = require('assert');
        const root = ${JSON.stringify(path.join(__dirname, '../src/main'))};
        const activity = require(root + '/activity-history-ui');
        const dashboard = require(root + '/dashboard-ui');
        const binder = require(root + '/recovery-binder-ui');
        document.body.innerHTML = '<div id="detailArea"></div><div id="detailActionArea"></div>';
        const area = document.getElementById('detailArea');
        const dock = document.getElementById('detailActionArea');
        const entries = [{timestamp: new Date().toISOString(), event: 'wallet-updated'}];
        for (const [module, method, response, options] of [
          [activity, 'getActivityHistory', {ok: true, entries}, undefined],
          [dashboard, 'getDashboardSummary', {ok: true, summary: {}}, undefined],
          [binder, 'getRecoveryBinder', {ok: true, binder: {walletCount: 0, assetCount: 0}}, {profile: {file: 'fixture.json', name: 'Disposable'}}]
        ]) {
          for (const outcome of ['resolve', 'reject']) {
            let finish;
            window.safeLedgerApi = {[method]: () => new Promise((resolve, reject) => { finish = outcome === 'resolve' ? () => resolve(response) : () => reject(new Error('Late failure')); })};
            const pending = module.show(options);
            area.innerHTML = '<h1>Login or another view</h1>';
            dock.innerHTML = '<button>Current actions</button>';
            finish(); await pending;
            assert.strictEqual(area.textContent, 'Login or another view', method + ' must not overwrite another view on ' + outcome);
            assert.strictEqual(dock.textContent, 'Current actions', method + ' must not replace another view actions');
          }
        }
        let first, second;
        window.safeLedgerApi = {getActivityHistory: () => new Promise(resolve => { if (!first) first = resolve; else second = resolve; })};
        const older = activity.show(); const newer = activity.show();
        second({ok: true, entries}); await newer;
        first({ok: true, entries: []}); await older;
        assert(area.textContent.includes('Wallet updated'), 'older history request must not replace latest response');
        const buttons = [...area.querySelectorAll('.activity-filter')];
        assert.strictEqual(buttons[0].getAttribute('aria-pressed'), 'true');
        buttons.find(button => button.dataset.filter === 'security').click();
        assert.strictEqual(buttons.filter(button => button.getAttribute('aria-pressed') === 'true').length, 1);
        assert.strictEqual(buttons.find(button => button.dataset.filter === 'security').getAttribute('aria-pressed'), 'true');
        assert(area.textContent.includes('No security activity'));
        return 'PASS Chromium detail views: delayed success/failure cannot replace navigation or lock screens; latest history wins; filters expose their state.';
      })()`));
      if (process.env.SAFELEDGER_UI_CAPTURE_DIR) {
        const fs = require('fs');
        fs.mkdirSync(process.env.SAFELEDGER_UI_CAPTURE_DIR, {recursive: true});
        win.webContents.debugger.attach('1.3');
        await win.webContents.debugger.sendCommand('DOM.enable');
        await win.webContents.debugger.sendCommand('CSS.enable');
        for (const width of [1100, 640]) {
          win.setContentSize(width, 760);
          for (const theme of ['light', 'dark', 'colorful']) {
            const geometry = await win.webContents.executeJavaScript(`(() => {
              document.documentElement.dataset.theme = ${JSON.stringify(theme)};
              document.documentElement.dataset.appearance = ${JSON.stringify(theme)};
              document.body.style.background = 'var(--sl-bg)';
              const area = document.getElementById('detailArea');
              area.style.cssText = 'width:min(540px,calc(100% - 32px));margin:16px auto;';
              require(${JSON.stringify(path.join(__dirname, '../src/main/activity-history-ui'))}).render([
                {timestamp: new Date().toISOString(), event: 'wallet-updated'},
                {timestamp: new Date().toISOString(), event: 'recovery-drill-completed'}
              ]);
              const filter = area.querySelector('.activity-filter');
              filter.focus();
              return {scroll: area.scrollWidth, width: area.clientWidth};
            })()`);
            // Hidden fixtures do not own OS focus. Force keyboard pseudo-states
            // through Chromium to inspect the production cascade deterministically.
            const {root} = await win.webContents.debugger.sendCommand('DOM.getDocument');
            const {nodeId} = await win.webContents.debugger.sendCommand('DOM.querySelector', {nodeId: root.nodeId, selector: '.activity-filter'});
            await win.webContents.debugger.sendCommand('CSS.forcePseudoState', {nodeId, forcedPseudoClasses: ['focus', 'focus-visible']});
            await new Promise(resolve => setTimeout(resolve, 100));
            fs.writeFileSync(path.join(process.env.SAFELEDGER_UI_CAPTURE_DIR, `activity-${theme}-${width}.png`), (await win.webContents.capturePage()).toPNG());
            const outline = await win.webContents.executeJavaScript(`getComputedStyle(document.querySelector('.activity-filter')).outlineStyle`);
            if (geometry.scroll > geometry.width + 1 || outline === 'none') throw new Error('Activity overflow or missing keyboard focus indicator: ' + JSON.stringify({...geometry, outline}));
          }
        }
        console.log('PASS activity geometry and focus outline at two widths in all three themes.');
      }
      app.exit(0);
    } catch (err) { console.error(err.stack); app.exit(1); }
  });
}
