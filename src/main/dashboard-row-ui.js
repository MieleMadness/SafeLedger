'use strict';

function patchRow(row) {
  if (!row || row.dataset.dashboardRowPatched === 'true') return;
  const main = row.querySelector('.dashboard-list-main-action');
  if (!main) return;
  row.dataset.dashboardRowPatched = 'true';
  row.tabIndex = 0;
  row.setAttribute('role', 'button');
  row.setAttribute('aria-label', main.getAttribute('aria-label') || 'Open vault item');
  row.addEventListener('click', (event) => {
    if (event.target.closest('.dashboard-list-main-action')) return;
    main.click();
  });
  row.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    main.click();
  });
}

function patch(root = document) {
  for (const row of root.querySelectorAll('.dashboard-list-row-action')) patchRow(row);
}

function start() {
  patch();
  const area = document.getElementById('detailArea');
  if (!area || typeof MutationObserver !== 'function') return;
  const observer = new MutationObserver(() => patch(area));
  observer.observe(area, { childList: true, subtree: true });
}

window.addEventListener('DOMContentLoaded', start);

exports._test = { patchRow, patch };
