'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runtimeRoot = path.join(root, 'src', 'main');
const indexFile = path.join(runtimeRoot, 'index.html');
const GENERATED_FILES = new Set(['src/main/renderer.bundle.js']);

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function rel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function resolveLocalRequire(fromFile, request) {
  if (!String(request || '').startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), request);
  const candidates = [base, `${base}.js`, path.join(base, 'index.js')];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function localRequires(file) {
  const source = fs.readFileSync(file, 'utf8');
  const dependencies = [];
  const pattern = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = pattern.exec(source))) {
    const resolved = resolveLocalRequire(file, match[1]);
    if (resolved) dependencies.push(resolved);
  }
  return dependencies;
}

function reachableJavaScript() {
  // These are distinct runtime roots: Electron main process, sandbox preload,
  // and the source entry bundled into renderer.bundle.js.
  const roots = [
    path.join(runtimeRoot, 'bootstrap.js'),
    path.join(runtimeRoot, 'preload.js'),
    path.join(runtimeRoot, 'renderer-entry.js')
  ];
  const reachable = new Set();
  const queue = roots.filter((file) => fs.existsSync(file));
  while (queue.length) {
    const file = queue.shift();
    const key = path.resolve(file);
    if (reachable.has(key)) continue;
    reachable.add(key);
    for (const dependency of localRequires(file)) {
      if (!reachable.has(path.resolve(dependency))) queue.push(dependency);
    }
  }
  return { roots, reachable };
}

function cssImports(file) {
  if (!fs.existsSync(file)) return [];
  const source = fs.readFileSync(file, 'utf8');
  const dependencies = [];
  const pattern = /@import\s+(?:url\(\s*)?['"]([^'"]+\.css)['"]\s*\)?[^;]*;/gi;
  let match;
  while ((match = pattern.exec(source))) {
    const request = String(match[1] || '').trim();
    if (!request || /^(?:[a-z]+:|\/\/|\/)/i.test(request)) continue;
    const resolved = path.resolve(path.dirname(file), request);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) dependencies.push(resolved);
  }
  return dependencies;
}

function runtimeCssReferences(sourceFiles) {
  const files = new Set();
  const patterns = [
    /\.href\s*=\s*['"]([^'"]+\.css)['"]/gi,
    /setAttribute\(\s*['"]href['"]\s*,\s*['"]([^'"]+\.css)['"]\s*\)/gi
  ];

  for (const file of sourceFiles || []) {
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(source))) {
        const request = String(match[1] || '').trim();
        if (!request || /^(?:[a-z]+:|\/\/|\/)/i.test(request)) continue;
        // Renderer stylesheet hrefs resolve from index.html, not from the JS
        // module's filesystem directory. All renderer source currently lives
        // beside index.html under src/main, so use the document root here.
        const resolved = path.resolve(runtimeRoot, request.replace(/^\.\//, ''));
        if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) files.add(resolved);
      }
    }
  }
  return files;
}

function linkedCss(runtimeSources = []) {
  const index = fs.readFileSync(indexFile, 'utf8');
  const files = new Set();
  const queue = [];
  const pattern = /<link\b[^>]*\bhref=["']([^"']+\.css)["'][^>]*>/gi;
  let match;
  while ((match = pattern.exec(index))) {
    const href = match[1];
    if (!href.startsWith('.')) continue;
    const resolved = path.resolve(runtimeRoot, href);
    if (fs.existsSync(resolved)) queue.push(resolved);
  }

  for (const dynamicFile of runtimeCssReferences(runtimeSources)) queue.push(dynamicFile);

  while (queue.length) {
    const file = path.resolve(queue.shift());
    if (files.has(file)) continue;
    files.add(file);
    for (const dependency of cssImports(file)) {
      if (!files.has(path.resolve(dependency))) queue.push(dependency);
    }
  }

  return files;
}

function referencedAssets(sourceFiles) {
  const assets = new Set();
  const patterns = [
    /(?:\.\.\/|\.\/)assets\/[A-Za-z0-9._/-]+/g,
    /assets\/[A-Za-z0-9._/-]+/g
  ];
  for (const file of sourceFiles) {
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(source))) {
        const token = match[0].replace(/[),;'"\s]+$/g, '');
        const assetIndex = token.indexOf('assets/');
        if (assetIndex < 0) continue;
        const relativeAsset = token.slice(assetIndex);
        const candidate = path.join(runtimeRoot, relativeAsset);
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) assets.add(path.resolve(candidate));
      }
    }
  }
  return assets;
}

function audit() {
  const all = walk(runtimeRoot);
  const allJs = all.filter((file) => file.endsWith('.js') && !GENERATED_FILES.has(rel(file)));
  const allCss = all.filter((file) => file.endsWith('.css'));
  const allAssets = all.filter((file) => rel(file).startsWith('src/main/assets/'));
  const jsGraph = reachableJavaScript();
  const css = linkedCss(jsGraph.reachable);
  const assetSources = [indexFile, ...Array.from(jsGraph.reachable), ...Array.from(css)];
  const assets = referencedAssets(assetSources);

  return {
    note: 'Static reachability audit only. Candidates are not safe to delete until tests, dynamic references, packaging, and hands-on behavior are reviewed.',
    roots: jsGraph.roots.map(rel),
    counts: {
      javascript: allJs.length,
      reachableJavascript: jsGraph.reachable.size,
      css: allCss.length,
      linkedCss: css.size,
      assets: allAssets.length,
      referencedAssets: assets.size
    },
    unreachableJavascript: allJs.filter((file) => !jsGraph.reachable.has(path.resolve(file))).map(rel).sort(),
    unlinkedCss: allCss.filter((file) => !css.has(path.resolve(file))).map(rel).sort(),
    unreferencedAssets: allAssets.filter((file) => !assets.has(path.resolve(file))).map(rel).sort()
  };
}

const report = audit();
if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  console.log('SafeLedger static dead-code audit');
  console.log(report.note);
  console.log(`Runtime roots: ${report.roots.join(', ')}`);
  console.log(`JavaScript: ${report.counts.reachableJavascript}/${report.counts.javascript} statically reachable`);
  console.log(`CSS: ${report.counts.linkedCss}/${report.counts.css} reachable through index.html, runtime stylesheet references, and local @import chains`);
  console.log(`Assets: ${report.counts.referencedAssets}/${report.counts.assets} statically referenced by reachable runtime sources`);
  for (const [label, values] of [
    ['Unreachable JavaScript candidates', report.unreachableJavascript],
    ['Unlinked CSS candidates', report.unlinkedCss],
    ['Unreferenced asset candidates', report.unreferencedAssets]
  ]) {
    console.log(`\n${label}:`);
    if (!values.length) console.log('  (none)');
    else values.forEach((value) => console.log(`  - ${value}`));
  }
}

module.exports = {
  walk,
  rel,
  resolveLocalRequire,
  localRequires,
  reachableJavaScript,
  cssImports,
  runtimeCssReferences,
  linkedCss,
  referencedAssets,
  audit
};
