'use strict';

const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');
const output = path.join(root, 'src', 'main', 'renderer.bundle.js');

async function run() {
  await esbuild.build({
    entryPoints: [path.join(root, 'src', 'main', 'renderer-entry.js')],
    outfile: output,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: ['chrome150'],
    sourcemap: false,
    minify: false,
    legalComments: 'none'
  });

  const bundled = fs.readFileSync(output, 'utf8');
  for (const forbidden of [
    "require('electron')", 'require("electron")',
    "require('fs')", 'require("fs")',
    "require('path')", 'require("path")',
    "require('crypto')", 'require("crypto")',
    'node:fs', 'node:path', 'node:crypto'
  ]) {
    if (bundled.includes(forbidden)) throw new Error(`Sandbox renderer bundle contains forbidden runtime dependency: ${forbidden}`);
  }
  console.log('Prepared SafeLedger renderer bundle with explicit preload bridge boundary.');
}

run().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
