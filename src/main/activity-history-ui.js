'use strict';

const detailActions = require('./detail-actions');
const activityHistory = require('./activity-history');

const FILTERS = Object.freeze([
  ['all', 'All'],
  ['recovery', 'Recovery'],
  ['security', 'Security'],
  ['data', 'Data'],
  ['system', 'System']
]);

function appendText(parent, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  parent.appendChild(node);
  return node;
}

function dayLabel(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((today - target) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function timeLabel(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function categoryLabel(category) {
  return String(category || 'system').charAt(0).toUpperCase() + String(category || 'system').slice(1);
}

function renderTimeline(host, entries, filter) {
  host.innerHTML = '';
  const filtered = filter === 'all'
    ? entries
    : entries.filter((entry) => activityHistory.describe(entry.event).category === filter);

  if (!filtered.length) {
    const empty = document.createElement('div');
    empty.className = 'activity-empty';
    appendText(empty, 'i', 'fa fa-history', '');
    appendText(empty, 'strong', '', filter === 'all' ? 'No activity recorded yet' : `No ${categoryLabel(filter).toLowerCase()} activity in this history`);
    appendText(empty, 'span', '', 'SafeLedger records only generic event types and timestamps.');
    host.appendChild(empty);
    return;
  }

  let currentDay = '';
  let group = null;
  for (const entry of filtered) {
    const label = dayLabel(entry.timestamp);
    if (label !== currentDay) {
      currentDay = label;
      const section = document.createElement('section');
      section.className = 'activity-day';
      appendText(section, 'h2', 'activity-day-title', label);
      group = document.createElement('div');
      group.className = 'activity-list';
      section.appendChild(group);
      host.appendChild(section);
    }

    const description = activityHistory.describe(entry.event);
    const row = document.createElement('div');
    row.className = `activity-row is-${description.category}`;
    const icon = document.createElement('div');
    icon.className = 'activity-icon';
    const iconGlyph = document.createElement('i');
    iconGlyph.className = `fa ${description.icon}`;
    iconGlyph.setAttribute('aria-hidden', 'true');
    icon.appendChild(iconGlyph);
    row.appendChild(icon);

    const body = document.createElement('div');
    body.className = 'activity-body';
    appendText(body, 'div', 'activity-title', description.label);
    const meta = document.createElement('div');
    meta.className = 'activity-meta';
    appendText(meta, 'span', `activity-category is-${description.category}`, categoryLabel(description.category));
    appendText(meta, 'span', 'activity-time', timeLabel(entry.timestamp));
    body.appendChild(meta);
    row.appendChild(body);
    group.appendChild(row);
  }
}

function render(entries) {
  detailActions.clear();
  const area = document.getElementById('detailArea');
  if (!area) return;
  area.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'activity-header';
  const titleWrap = document.createElement('div');
  appendText(titleWrap, 'h1', '', 'Activity History');
  appendText(titleWrap, 'p', '', 'A privacy-preserving local timeline of SafeLedger maintenance, recovery, and security actions.');
  header.appendChild(titleWrap);
  const count = document.createElement('div');
  count.className = 'activity-count';
  appendText(count, 'strong', '', String(entries.length));
  appendText(count, 'span', '', ' recent events');
  header.appendChild(count);
  area.appendChild(header);

  const privacy = document.createElement('div');
  privacy.className = 'activity-privacy';
  const shield = document.createElement('i');
  shield.className = 'fa fa-shield';
  shield.setAttribute('aria-hidden', 'true');
  privacy.appendChild(shield);
  appendText(
    privacy,
    'div',
    '',
    'History stores only a timestamp and generic event type. Profile names, wallet names, asset names, addresses, balances, notes, recovery locations, passwords, PINs, seeds, private keys, and custom-field values are never written to this log.'
  );
  area.appendChild(privacy);

  const filters = document.createElement('div');
  filters.className = 'activity-filters';
  const timeline = document.createElement('div');
  timeline.className = 'activity-timeline';
  let active = 'all';
  const buttons = [];
  for (const [key, label] of FILTERS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `activity-filter${key === active ? ' is-active' : ''}`;
    button.textContent = label;
    button.addEventListener('click', () => {
      active = key;
      buttons.forEach((item) => item.classList.toggle('is-active', item.dataset.filter === active));
      renderTimeline(timeline, entries, active);
    });
    button.dataset.filter = key;
    buttons.push(button);
    filters.appendChild(button);
  }
  area.appendChild(filters);
  area.appendChild(timeline);
  renderTimeline(timeline, entries, active);

  const retention = document.createElement('p');
  retention.className = 'activity-retention';
  retention.textContent = `SafeLedger keeps up to ${activityHistory.MAX_STORED_ENTRIES} generic local activity events and shows the ${activityHistory.DEFAULT_READ_LIMIT} most recent by default.`;
  area.appendChild(retention);
}

async function show() {
  detailActions.clear();
  const area = document.getElementById('detailArea');
  if (!area || !window.safeLedgerApi || typeof window.safeLedgerApi.getActivityHistory !== 'function') return;
  area.innerHTML = '';
  const loading = document.createElement('p');
  loading.className = 'activity-loading';
  loading.textContent = 'Reading local activity history…';
  area.appendChild(loading);
  try {
    const result = await window.safeLedgerApi.getActivityHistory(activityHistory.DEFAULT_READ_LIMIT);
    if (!result || result.ok !== true || !Array.isArray(result.entries)) throw new Error(result && result.message ? result.message : 'Unable to read activity history.');
    render(result.entries);
  } catch (err) {
    area.innerHTML = '';
    const warning = document.createElement('p');
    warning.className = 'alert alert-warning';
    warning.textContent = err && err.message ? err.message : 'Unable to read activity history.';
    area.appendChild(warning);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('activityButton');
  if (button) button.addEventListener('click', (event) => { event.preventDefault(); show(); });
});

exports.show = show;
exports.render = render;
exports._test = { FILTERS, dayLabel, timeLabel, categoryLabel, renderTimeline };
