'use strict';

function cancelIcon() {
  return '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false" style="display:block"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
}

function selectedTarget(kind) {
  if (kind === 'asset') return document.querySelector('#groupArea .nav > li > a.item-selected');
  return document.querySelector('#vaultArea .nav > li > a.item-selected');
}

function detectAddForm(area) {
  const heading = area && area.querySelector('h1');
  const text = String(heading && heading.textContent || '').trim().toLowerCase();
  if (text === 'add asset') return { kind: 'asset', title: 'Cancel add asset' };
  if (text === 'add vault item' || text === 'add wallet') return { kind: 'vault-item', title: 'Cancel add vault item' };
  return null;
}

function patch() {
  const area = document.getElementById('detailArea');
  const dock = document.getElementById('detailActionArea');
  if (!area || !dock) return;
  const mode = detectAddForm(area);
  const existing = dock.querySelector('.detail-action-add-cancel');
  if (!mode) {
    if (existing) existing.remove();
    return;
  }
  if (existing && existing.dataset.cancelKind === mode.kind) return;
  if (existing) existing.remove();

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-default detail-action-button detail-action-cancel detail-action-add-cancel';
  button.dataset.cancelKind = mode.kind;
  button.title = mode.title;
  button.setAttribute('aria-label', mode.title);
  button.innerHTML = cancelIcon();
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const target = selectedTarget(mode.kind);
    if (target && typeof target.click === 'function') target.click();
  });
  dock.insertBefore(button, dock.firstChild);
}

function start() {
  patch();
  const area = document.getElementById('detailArea');
  const dock = document.getElementById('detailActionArea');
  if (!area || !dock) return;
  const observer = new MutationObserver(() => setTimeout(patch, 0));
  observer.observe(area, { childList: true, subtree: true });
  observer.observe(dock, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports._test = { cancelIcon, selectedTarget, detectAddForm };
