'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json'));
const runtimeUtils = require(path.join(root, 'src/main/runtime-utils.js'));
const versionParts = String(pkg.version || '').split('.').map((part) => Number.parseInt(part, 10));

assert(versionParts[0] === 2 && versionParts[1] === 6 && versionParts[2] >= 1,
  'SafeLedger 2.6.1 Apple Silicon gates must continue to apply to later 2.6.x releases.');
assert.strictEqual(pkg.build.mac.category, 'public.app-category.utilities');
assert.strictEqual(pkg.build.mac.identity, null, '2.6.1+ development must not require an Apple signing identity.');
assert.deepStrictEqual(pkg.build.mac.target, [{ target: 'zip', arch: ['arm64'] }]);
assert.strictEqual(pkg.build.mac.artifactName, 'SafeLedger-${version}-macOS-arm64.${ext}');
assert(pkg.scripts['dist:mac:arm64'].includes('--mac zip --arm64'), '2.6.1+ must expose a native Apple Silicon build command.');

const macExec = '/Volumes/SafeLedger/SafeLedger.app/Contents/MacOS/SafeLedger';
assert.strictEqual(runtimeUtils.findMacAppBundle(macExec), '/Volumes/SafeLedger/SafeLedger.app');
assert.strictEqual(runtimeUtils.getPortableRoot({ platform:'darwin', execPath:macExec, isPackaged:true, env:{} }), '/Volumes/SafeLedger');
assert.strictEqual(runtimeUtils.getPortableRoot({ platform:'darwin', execPath:'/Users/test/Downloads/SafeLedger.app/Contents/MacOS/SafeLedger', isPackaged:true, env:{ PORTABLE_EXECUTABLE_DIR:'/tmp/safeledger-gui-smoke' } }), '/tmp/safeledger-gui-smoke');

const translocated = '/private/var/folders/xx/AppTranslocation/ABC/d/SafeLedger.app/Contents/MacOS/SafeLedger';
assert.strictEqual(runtimeUtils.isMacAppTranslocated(translocated), true);
assert.strictEqual(runtimeUtils.isMacAppTranslocated(macExec), false);

const writableInfo = runtimeUtils.inspectPortableRoot({ platform:'darwin', execPath:macExec, isPackaged:true, env:{}, fs:{ accessSync() {} } });
assert.strictEqual(writableInfo.root, '/Volumes/SafeLedger');
assert.strictEqual(writableInfo.writable, true);
assert.strictEqual(writableInfo.translocated, false);
assert.strictEqual(writableInfo.safeForPortableData, true);

const blockedInfo = runtimeUtils.inspectPortableRoot({ platform:'darwin', execPath:translocated, isPackaged:true, env:{}, fs:{ accessSync() { throw new Error('read only'); } } });
assert.strictEqual(blockedInfo.translocated, true);
assert.strictEqual(blockedInfo.writable, false);
assert.strictEqual(blockedInfo.safeForPortableData, false);

const safeStartup = runtimeUtils.getPortableStartupStatus({ platform:'darwin', execPath:macExec, isPackaged:true, env:{}, fs:{ accessSync() {} } });
assert.strictEqual(safeStartup.allowed, true);
assert.strictEqual(safeStartup.blocked, false);
assert.strictEqual(safeStartup.reason, 'ok');
assert.strictEqual(runtimeUtils.portableStartupMessage(safeStartup), null);

const translocatedStartup = runtimeUtils.getPortableStartupStatus({ platform:'darwin', execPath:translocated, isPackaged:true, env:{}, fs:{ accessSync() {} } });
assert.strictEqual(translocatedStartup.allowed, false);
assert.strictEqual(translocatedStartup.reason, 'app-translocation');
assert(runtimeUtils.portableStartupMessage(translocatedStartup).detail.includes('will not create or move vault data'));

const readOnlyStartup = runtimeUtils.getPortableStartupStatus({ platform:'darwin', execPath:macExec, isPackaged:true, env:{}, fs:{ accessSync() { throw new Error('read only'); } } });
assert.strictEqual(readOnlyStartup.allowed, false);
assert.strictEqual(readOnlyStartup.reason, 'portable-root-read-only');
assert(runtimeUtils.portableStartupMessage(readOnlyStartup).detail.includes('will not create a second hidden copy of SafeLedgerData'));

const windowsUnchanged = runtimeUtils.getPortableStartupStatus({ platform:'win32', execPath:'C:\\SafeLedger\\SafeLedger.exe', isPackaged:true, env:{}, fs:{ accessSync() { throw new Error('simulated'); } } });
assert.strictEqual(windowsUnchanged.allowed, true);

const bootstrap = read('src/main/bootstrap.js');
assert(bootstrap.includes('const startupStorageStatus = runtimeUtils.getPortableStartupStatus'));
assert(bootstrap.indexOf('const startupStorageStatus = runtimeUtils.getPortableStartupStatus') < bootstrap.indexOf("require('./main')"));
assert(bootstrap.includes('if (startupStorageStatus.allowed)'));
assert(bootstrap.includes("buttons: ['Quit SafeLedger']"));
assert(bootstrap.includes('if (!startupStorageStatus.allowed) return;'));
assert(!bootstrap.includes("app.getPath('userData')"));
assert(!bootstrap.includes('Application Support'));

const workflow = read('.github/workflows/macos-arm64.yml');
for (const phrase of ['runs-on: macos-15','safeledger-2.6.1-development','CSC_IDENTITY_AUTO_DISCOVERY: "false"','test "$(uname -m)" = "arm64"','npm run test:regression','npm run test:electron-crypto','npm run test:gui-smoke','npm run dist:mac:arm64','lipo -archs','SafeLedger-macOS-arm64']) {
  assert(workflow.includes(phrase), `macOS arm64 workflow must include: ${phrase}`);
}

const release = read('RELEASE-2.6.1.md');
assert(release.includes('Development preview: 2.6.1'));
assert(release.includes('Apple Silicon (`arm64`) only'));
assert(release.includes('does **not** claim Developer ID signing or Apple notarization'));
assert(release.includes('SafeLedger.app') && release.includes('SafeLedgerData'));
assert(release.includes('never trigger Self-Destruct'));

console.log(`PASS SafeLedger ${pkg.version} preserves the 2.6.1 Apple Silicon packaging, fail-closed portable startup, unsigned CI, and documentation gates.`);
