'use strict';

/*
 * SafeLedger visual window sizing helper.
 *
 * Vault Item detail artwork is now rendered directly by group.js. This module
 * only applies the preferred initial application size when screen space allows.
 * It does not observe or patch renderer content.
 */

const DETAIL_WIDTH = 1400;
const DETAIL_HEIGHT = 750;

function preferredWindowSize(win = window) {
  const availableWidth = win.screen && Number(win.screen.availWidth) > 0
    ? Number(win.screen.availWidth)
    : DETAIL_WIDTH;
  const availableHeight = win.screen && Number(win.screen.availHeight) > 0
    ? Number(win.screen.availHeight)
    : DETAIL_HEIGHT;
  return {
    width: Math.min(DETAIL_WIDTH, availableWidth),
    height: Math.min(DETAIL_HEIGHT, availableHeight)
  };
}

function applyPreferredWindowSize(win = window) {
  if (!win || typeof win.resizeTo !== 'function') return false;
  const target = preferredWindowSize(win);
  const currentWidth = Number(win.outerWidth) || 0;
  const currentHeight = Number(win.outerHeight) || 0;

  // Only grow the initial/default window. Do not shrink a window the user or
  // operating system has already made larger.
  if (currentWidth >= target.width && currentHeight >= target.height) return false;
  win.resizeTo(Math.max(currentWidth, target.width), Math.max(currentHeight, target.height));
  return true;
}

function start() {
  applyPreferredWindowSize(window);
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports.DETAIL_WIDTH = DETAIL_WIDTH;
exports.DETAIL_HEIGHT = DETAIL_HEIGHT;
exports._test = { preferredWindowSize, applyPreferredWindowSize };
