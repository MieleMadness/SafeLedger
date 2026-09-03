'use strict';

const { app, screen } = require('electron');
const windowSizing = require('./window-sizing-main');

let primaryWindowSized = false;
app.on('browser-window-created', (_event, win) => {
  if (primaryWindowSized) return;
  primaryWindowSized = true;
  let workArea = {};
  try {
    const display = screen.getPrimaryDisplay();
    workArea = display && display.workAreaSize ? display.workAreaSize : {};
  } catch (_) {}
  windowSizing.applyPreferredWindowSize(win, workArea);
});

require('./bootstrap');
