'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const cssRoot = path.join(root, 'src', 'main', 'css');
const manifestFile = path.join(cssRoot, 'app.css');

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function stripComments(source) {
  return String(source || '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function manifestImports() {
  const source = read(manifestFile);
  return Array.from(
    source.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+\.css)["']\s*\)?[^;]*;/gi),
    (match) => match[1]
  );
}

function splitSelectors(header) {
  const selectors = [];
  let current = '';
  let quote = null;
  let parens = 0;
  let brackets = 0;

  for (let i = 0; i < header.length; i += 1) {
    const char = header[i];
    if (quote) {
      current += char;
      if (char === quote && header[i - 1] !== '\\') quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === '(') parens += 1;
    else if (char === ')') parens = Math.max(0, parens - 1);
    else if (char === '[') brackets += 1;
    else if (char === ']') brackets = Math.max(0, brackets - 1);

    if (char === ',' && parens === 0 && brackets === 0) {
      if (current.trim()) selectors.push(current.trim().replace(/\s+/g, ' '));
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) selectors.push(current.trim().replace(/\s+/g, ' '));
  return selectors;
}

function findClosingBrace(source, openingIndex) {
  let depth = 1;
  let quote = null;
  for (let i = openingIndex + 1; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (char === quote && source[i - 1] !== '\\') quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error(`Unbalanced CSS block near index ${openingIndex}`);
}

function normalizeDeclarations(body) {
  return String(body || '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([:;,])\s*/g, '$1')
    .trim();
}

function parseRules(source, file, context = [], startLine = 1) {
  const rules = [];
  let cursor = 0;
  let line = startLine;

  while (cursor < source.length) {
    const opening = source.indexOf('{', cursor);
    if (opening < 0) break;

    const prefix = source.slice(cursor, opening);
    const headerStartOffset = Math.max(prefix.lastIndexOf('}'), prefix.lastIndexOf(';')) + 1;
    const headerRaw = prefix.slice(headerStartOffset);
    const header = headerRaw.trim();
    line += prefix.slice(0, headerStartOffset).split('\n').length - 1;
    const headerLine = line + (headerRaw.slice(0, headerRaw.indexOf(header)).split('\n').length - 1);
    const closing = findClosingBrace(source, opening);
    const body = source.slice(opening + 1, closing);

    if (header.startsWith('@')) {
      const lower = header.toLowerCase();
      if (/^@(media|supports|container|layer|document)\b/.test(lower)) {
        rules.push(...parseRules(body, file, [...context, header.replace(/\s+/g, ' ')], headerLine));
      }
    } else if (header) {
      const normalizedBody = normalizeDeclarations(body);
      const importantCount = (body.match(/!important\b/gi) || []).length;
      for (const selector of splitSelectors(header)) {
        rules.push({
          selector,
          file,
          line: headerLine,
          context: context.join(' > '),
          body: normalizedBody,
          importantCount
        });
      }
    }

    const consumed = source.slice(cursor, closing + 1);
    line += consumed.split('\n').length - 1;
    cursor = closing + 1;
  }

  return rules;
}

function audit() {
  const imports = manifestImports();
  const missing = imports.filter((file) => !fs.existsSync(path.join(cssRoot, file)));
  const rules = [];
  const importantByFile = {};

  for (const file of imports) {
    const full = path.join(cssRoot, file);
    if (!fs.existsSync(full)) continue;
    const source = stripComments(read(full));
    const fileRules = parseRules(source, file);
    rules.push(...fileRules);
    importantByFile[file] = (source.match(/!important\b/gi) || []).length;
  }

  const bySelector = new Map();
  for (const rule of rules) {
    const key = `${rule.context}\u0000${rule.selector}`;
    if (!bySelector.has(key)) bySelector.set(key, []);
    bySelector.get(key).push(rule);
  }

  const duplicates = [];
  for (const entries of bySelector.values()) {
    if (entries.length < 2) continue;
    const bodies = new Set(entries.map((entry) => entry.body));
    duplicates.push({
      selector: entries[0].selector,
      context: entries[0].context,
      kind: bodies.size === 1 ? 'identical' : 'override',
      occurrences: entries.map(({ file, line, body, importantCount }) => ({ file, line, body, importantCount }))
    });
  }

  duplicates.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    if (b.occurrences.length !== a.occurrences.length) return b.occurrences.length - a.occurrences.length;
    return a.selector.localeCompare(b.selector);
  });

  return {
    imports,
    missing,
    ruleInstances: rules.length,
    uniqueSelectorContexts: bySelector.size,
    duplicateSelectorContexts: duplicates.length,
    identicalDuplicateSelectorContexts: duplicates.filter((entry) => entry.kind === 'identical').length,
    overrideSelectorContexts: duplicates.filter((entry) => entry.kind === 'override').length,
    importantCount: Object.values(importantByFile).reduce((sum, value) => sum + value, 0),
    importantByFile,
    duplicates
  };
}

function printReport(report) {
  console.log('SafeLedger CSS ownership audit');
  console.log(`Cascade files: ${report.imports.length}`);
  console.log(`Rule instances: ${report.ruleInstances}`);
  console.log(`Unique selector/context pairs: ${report.uniqueSelectorContexts}`);
  console.log(`Duplicate selector/context pairs: ${report.duplicateSelectorContexts}`);
  console.log(`  Identical duplicates: ${report.identicalDuplicateSelectorContexts}`);
  console.log(`  Intentional/competing overrides to review: ${report.overrideSelectorContexts}`);
  console.log(`!important declarations: ${report.importantCount}`);

  console.log('\n!important by file:');
  Object.entries(report.importantByFile)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([file, count]) => console.log(`  ${String(count).padStart(3, ' ')}  ${file}`));

  console.log('\nDuplicate selector ownership:');
  if (!report.duplicates.length) console.log('  (none)');
  for (const entry of report.duplicates) {
    const locations = entry.occurrences.map((item) => `${item.file}:${item.line}`).join(', ');
    console.log(`  [${entry.kind}] ${entry.selector}${entry.context ? ` @ ${entry.context}` : ''}`);
    console.log(`    ${locations}`);
  }
}

if (require.main === module) {
  const report = audit();
  if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else printReport(report);
  if (report.missing.length) process.exitCode = 1;
}

module.exports = {
  manifestImports,
  splitSelectors,
  normalizeDeclarations,
  parseRules,
  audit,
  printReport
};
