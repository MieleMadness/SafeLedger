'use strict';

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

app.disableHardwareAcceleration();

function resolveOutputPath() {
  const requested = process.argv.slice(2).find((arg) => arg && !arg.startsWith('--'));
  return path.resolve(process.cwd(), requested || 'README.pdf');
}

function buildHtml(markdown) {
  marked.setOptions({ gfm: true, breaks: false });
  const body = marked.parse(markdown);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>SafeLedger README</title>
<style>
  @page { size: Letter; margin: 0.55in; }
  * { box-sizing: border-box; }
  html, body { background: #fff; }
  body {
    margin: 0;
    color: #1f2328;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
  }
  h1, h2, h3, h4 { color: #0D47A1; line-height: 1.2; break-after: avoid; }
  h1 { margin: 0 0 16px; padding-bottom: 8px; font-size: 26pt; border-bottom: 2px solid #1976D2; }
  h2 { margin: 24px 0 10px; padding-bottom: 5px; font-size: 17pt; border-bottom: 1px solid #d8dee4; }
  h3 { margin: 18px 0 8px; font-size: 13pt; }
  h4 { margin: 15px 0 7px; font-size: 11pt; }
  p { margin: 7px 0 10px; }
  ul, ol { margin: 7px 0 12px; padding-left: 24px; }
  li { margin: 3px 0; }
  strong { color: #111; }
  code {
    padding: 1px 4px;
    border-radius: 4px;
    background: #f3f4f6;
    font-family: Consolas, 'Courier New', monospace;
    font-size: 9.3pt;
  }
  pre {
    margin: 10px 0 14px;
    padding: 11px 13px;
    border: 1px solid #d8dee4;
    border-radius: 6px;
    background: #f6f8fa;
    white-space: pre-wrap;
    word-break: break-word;
    break-inside: avoid;
  }
  pre code { padding: 0; background: transparent; }
  blockquote {
    margin: 12px 0;
    padding: 9px 12px;
    border-left: 4px solid #1976D2;
    background: #f3f8ff;
    color: #30363d;
    break-inside: avoid;
  }
  blockquote > :first-child { margin-top: 0; }
  blockquote > :last-child { margin-bottom: 0; }
  table {
    width: 100%;
    margin: 10px 0 16px;
    border-collapse: collapse;
    font-size: 9.5pt;
  }
  th, td { padding: 6px 8px; border: 1px solid #d0d7de; vertical-align: top; }
  th { background: #f6f8fa; text-align: left; }
  tr { break-inside: avoid; }
  hr { height: 1px; margin: 18px 0; border: 0; background: #d8dee4; }
  a { color: #1565C0; text-decoration: none; }
  img { max-width: 100%; }
</style>
</head>
<body>${body}</body>
</html>`;
}

async function generatePdf() {
  const readmePath = path.join(process.cwd(), 'README.md');
  const outputPath = resolveOutputPath();
  const markdown = await fs.promises.readFile(readmePath, 'utf8');
  const html = buildHtml(markdown);

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  try {
    await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdf = await window.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: 'Letter'
    });
    await fs.promises.writeFile(outputPath, pdf);
    console.log(`SafeLedger README PDF created: ${outputPath}`);
  } finally {
    if (!window.isDestroyed()) window.destroy();
  }
}

app.whenReady()
  .then(generatePdf)
  .then(() => app.quit())
  .catch((err) => {
    console.error('README PDF GENERATION FAILED');
    console.error(err && err.stack ? err.stack : err);
    app.exit(1);
  });

exports._test = { resolveOutputPath, buildHtml };
