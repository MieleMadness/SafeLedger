'use strict';

const fs = require('fs');
const path = require('path');
const { manifestImports, parseRules } = require('./css-ownership-audit');

const root = path.join(__dirname, '..');
const cssRoot = path.join(root, 'src', 'main', 'css');

function read(relative) {
  return fs.readFileSync(path.join(cssRoot, relative), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

function stripComments(source) {
  return String(source || '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseDeclarations(body) {
  const declarations = [];
  let current = '';
  let quote = null;
  let parens = 0;

  const flush = () => {
    const raw = current.trim();
    current = '';
    if (!raw) return;
    const colon = raw.indexOf(':');
    if (colon <= 0) return;
    const property = raw.slice(0, colon).trim().toLowerCase();
    let value = raw.slice(colon + 1).trim();
    const important = /\s*!important\s*$/i.test(value);
    if (important) value = value.replace(/\s*!important\s*$/i, '').trim();
    declarations.push({ property, value, important });
  };

  for (let i = 0; i < body.length; i += 1) {
    const char = body[i];
    if (quote) {
      current += char;
      if (char === quote && body[i - 1] !== '\\') quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === '(') parens += 1;
    else if (char === ')') parens = Math.max(0, parens - 1);

    if (char === ';' && parens === 0) flush();
    else current += char;
  }
  flush();
  return declarations;
}

function audit() {
  const imports = manifestImports();
  const rules = [];

  for (const file of imports) {
    const source = stripComments(read(file));
    for (const rule of parseRules(source, file)) {
      rules.push({
        ...rule,
        declarations: parseDeclarations(rule.body)
      });
    }
  }

  const bySelector = new Map();
  for (const rule of rules) {
    const key = `${rule.context}\u0000${rule.selector}`;
    if (!bySelector.has(key)) bySelector.set(key, []);
    bySelector.get(key).push(rule);
  }

  const blocks = new Map();
  for (const rule of rules) {
    const blockKey = `${rule.file}\u0000${rule.line}\u0000${rule.context}\u0000${rule.body}`;
    if (!blocks.has(blockKey)) {
      blocks.set(blockKey, {
        file: rule.file,
        line: rule.line,
        context: rule.context,
        body: rule.body,
        selectors: [],
        declarations: rule.declarations
      });
    }
    blocks.get(blockKey).selectors.push(rule.selector);
  }

  const removable = [];
  for (const block of blocks.values()) {
    for (const declaration of block.declarations) {
      if (!declaration.important) continue;
      const shadowedBy = [];
      let safeForAllSelectors = true;

      for (const selector of block.selectors) {
        const key = `${block.context}\u0000${selector}`;
        const entries = bySelector.get(key) || [];
        const currentIndex = entries.findIndex((entry) =>
          entry.file === block.file && entry.line === block.line && entry.body === block.body
        );
        if (currentIndex < 0) {
          safeForAllSelectors = false;
          break;
        }

        let laterOwner = null;
        for (let i = currentIndex + 1; i < entries.length; i += 1) {
          const laterDeclaration = entries[i].declarations.find((item) =>
            item.property === declaration.property && item.important
          );
          if (laterDeclaration) {
            laterOwner = {
              selector,
              file: entries[i].file,
              line: entries[i].line,
              value: laterDeclaration.value
            };
            break;
          }
        }

        if (!laterOwner) {
          safeForAllSelectors = false;
          break;
        }
        shadowedBy.push(laterOwner);
      }

      if (safeForAllSelectors) {
        removable.push({
          file: block.file,
          line: block.line,
          context: block.context,
          selectors: block.selectors,
          property: declaration.property,
          value: declaration.value,
          shadowedBy
        });
      }
    }
  }

  removable.sort((a, b) =>
    a.file.localeCompare(b.file) || a.line - b.line || a.property.localeCompare(b.property)
  );

  return {
    imports,
    importantCount: rules.reduce((sum, rule) => sum + rule.declarations.filter((item) => item.important).length, 0),
    removableImportantDeclarations: removable.length,
    removable
  };
}

function printReport(report) {
  console.log('SafeLedger !important ownership audit');
  console.log(`Cascade files: ${report.imports.length}`);
  console.log(`!important declarations across selector instances: ${report.importantCount}`);
  console.log(`Provably shadowed !important declarations: ${report.removableImportantDeclarations}`);
  if (!report.removable.length) {
    console.log('  (none)');
    return;
  }
  for (const item of report.removable) {
    const selectors = item.selectors.join(', ');
    const owners = item.shadowedBy.map((owner) => `${owner.file}:${owner.line}`).join(', ');
    console.log(`  ${item.file}:${item.line} ${selectors}`);
    console.log(`    ${item.property}: ${item.value} !important`);
    console.log(`    later important owner(s): ${owners}`);
  }
}

if (require.main === module) {
  const report = audit();
  if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  else printReport(report);
}

module.exports = {
  parseDeclarations,
  audit,
  printReport
};
