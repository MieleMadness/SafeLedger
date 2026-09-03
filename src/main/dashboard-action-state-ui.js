'use strict';

const detailActions = require('./detail-actions');

// Vault Overview is a top-level destination, so form-specific actions from the
// previous detail view must never follow the user onto the dashboard. Keep this
// cleanup on the real dashboard navigation button so both a normal Home click
// and programmatic navigation (such as Cancel Add Profile) use the same path.
function clearDashboardActions() {
  detailActions.clear();
}

window.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('dashboardButton');
  if (button) button.addEventListener('click', clearDashboardActions);
});

exports._test = { clearDashboardActions };
