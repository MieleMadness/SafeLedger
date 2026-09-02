'use strict';

function lockIconMarkup() {
  return '<span class="sl-change-password-icon" aria-hidden="true" style="display:inline-flex;width:1.1em;height:1.1em;align-items:center;justify-content:center;margin-right:.35em;vertical-align:-.15em"><svg viewBox="0 0 24 24" width="18" height="18" focusable="false"><rect x="5" y="10" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="15" r="1.35" fill="currentColor"/></svg></span>';
}

function patchChangePasswordIcon(root = document) {
  const sections = root.querySelectorAll ? root.querySelectorAll('.settings-section') : [];
  for (const section of sections) {
    const heading = section.querySelector('.settings-section-title');
    if (!heading || String(heading.textContent || '').trim() !== 'Password') continue;
    const button = [...section.querySelectorAll('button')].find((candidate) => String(candidate.textContent || '').includes('Change Password'));
    if (!button || button.querySelector('.sl-change-password-icon')) return;
    const old = button.querySelector('i.fa-lock');
    if (old) old.remove();
    button.insertAdjacentHTML('afterbegin', lockIconMarkup());
    return;
  }
}

function start() {
  patchChangePasswordIcon();
  const area = document.getElementById('detailArea');
  if (!area) return;
  const observer = new MutationObserver(() => patchChangePasswordIcon(area));
  observer.observe(area, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports._test = { lockIconMarkup, patchChangePasswordIcon };
