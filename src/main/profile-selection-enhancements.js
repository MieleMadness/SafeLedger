'use strict';

function applyProfileSelection() {
  const area = document.getElementById('vaultArea');
  if (!area) return false;

  const selectedBadge = area.querySelector('.badge-selected');
  if (!selectedBadge) return false;

  const link = selectedBadge.closest('a');
  if (!link) return false;

  link.classList.add('profile-selected');
  link.setAttribute('aria-current', 'true');
  return true;
}

function install() {
  const area = document.getElementById('vaultArea');
  if (!area) return;
  const update = () => queueMicrotask(applyProfileSelection);
  new MutationObserver(update).observe(area, { childList: true, subtree: true });
  applyProfileSelection();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', install, { once: true });
} else {
  install();
}

exports._test = { applyProfileSelection };
