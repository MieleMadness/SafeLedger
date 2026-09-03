'use strict';

const PREFERRED_WIDTH = 1400;
const PREFERRED_HEIGHT = 750;

function preferredWindowSize(workArea = {}) {
  const availableWidth = Number(workArea.width) > 0 ? Number(workArea.width) : PREFERRED_WIDTH;
  const availableHeight = Number(workArea.height) > 0 ? Number(workArea.height) : PREFERRED_HEIGHT;
  return {
    width: Math.min(PREFERRED_WIDTH, availableWidth),
    height: Math.min(PREFERRED_HEIGHT, availableHeight)
  };
}

function applyPreferredWindowSize(win, workArea = {}) {
  if (!win || typeof win.getBounds !== 'function' || typeof win.setSize !== 'function') return false;
  const current = win.getBounds() || {};
  const currentWidth = Number(current.width) || 0;
  const currentHeight = Number(current.height) || 0;
  const target = preferredWindowSize(workArea);
  const width = Math.max(currentWidth, target.width);
  const height = Math.max(currentHeight, target.height);
  if (width === currentWidth && height === currentHeight) return false;
  win.setSize(width, height, false);
  return true;
}

exports.PREFERRED_WIDTH = PREFERRED_WIDTH;
exports.PREFERRED_HEIGHT = PREFERRED_HEIGHT;
exports.preferredWindowSize = preferredWindowSize;
exports.applyPreferredWindowSize = applyPreferredWindowSize;
