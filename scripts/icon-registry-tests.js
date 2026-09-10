'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const runtimeRoot = path.join(root, 'src', 'main');
const localIconPath = path.join(runtimeRoot, 'css', 'local-icons.css');
// Match complete icon-class tokens only. The boundaries deliberately reject
// substrings inside template prefixes (fa-chevron-${...}) and unrelated text
// such as hexadecimal regex ranges ([0-9a-fA-F]).
const ICON_TOKEN = /(?<![a-z0-9-])(?:fa|glyphicon)-[a-z0-9]+(?:-[a-z0-9]+)*(?![a-z0-9-])/gi;
const ICON_SELECTOR = /\.(?:fa|glyphicon)-[a-z0-9]+(?:-[a-z0-9]+)*/gi;
const MODIFIER_CLASSES = new Set(['fa-spin']);
const GENERATED_RUNTIME_ICONS = Object.freeze(['fa-chevron-left', 'fa-chevron-right']);

function runtimeFiles(dir = runtimeRoot) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...runtimeFiles(full));
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name === 'renderer.bundle.js') continue;
    if (!/\.(?:js|html)$/i.test(entry.name)) continue;
    files.push(full);
  }
  return files.sort();
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function extractIconTokens(source) {
  return Array.from(String(source || '').matchAll(ICON_TOKEN), (match) => match[0].toLowerCase());
}

function collectRuntimeIcons(files = runtimeFiles()) {
  const usedBy = new Map();
  const remember = (token, source) => {
    const normalized = String(token || '').toLowerCase();
    if (!normalized || MODIFIER_CLASSES.has(normalized)) return;
    const locations = usedBy.get(normalized) || new Set();
    locations.add(source);
    usedBy.set(normalized, locations);
  };

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const token of extractIconTokens(source)) remember(token, relative(file));
  }
  for (const token of GENERATED_RUNTIME_ICONS) remember(token, '<generated runtime class>');
  return usedBy;
}

function collectDefinedIcons(css = fs.readFileSync(localIconPath, 'utf8')) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return new Set(Array.from(withoutComments.matchAll(ICON_SELECTOR), (match) => match[0].slice(1).toLowerCase()));
}

function findMissingIcons(usedBy = collectRuntimeIcons(), defined = collectDefinedIcons()) {
  return Array.from(usedBy.keys()).filter((token) => !defined.has(token)).sort();
}

const usedBy = collectRuntimeIcons();
const defined = collectDefinedIcons();
const missing = findMissingIcons(usedBy, defined);
const localIcons = fs.readFileSync(localIconPath, 'utf8');

assert(localIcons.includes('.fa::before,\n.glyphicon::before { content: "•"; }'),
  'The generic dot must remain a diagnostic fallback for truly unknown icon classes.');
assert(usedBy.size > 20, 'Icon registry scan unexpectedly found too few runtime icon classes.');
assert.deepStrictEqual(missing, [], missing.length
  ? `Undefined SafeLedger local icon classes:\n${missing.map((token) => `- ${token}: ${Array.from(usedBy.get(token) || []).join(', ')}`).join('\n')}`
  : 'Every runtime icon class must have a local definition.');

console.log(`PASS SafeLedger local icon registry covers ${usedBy.size} runtime icon classes; no live fa-/glyphicon- reference can silently fall back to a dot.`);

module.exports = { runtimeFiles, extractIconTokens, collectRuntimeIcons, collectDefinedIcons, findMissingIcons, GENERATED_RUNTIME_ICONS, MODIFIER_CLASSES };
