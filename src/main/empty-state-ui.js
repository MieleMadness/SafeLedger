'use strict';

function appendText(parent, tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  node.textContent = text;
  parent.appendChild(node);
  return node;
}

function renderColumn(area, options = {}) {
  if (!area) return;
  area.innerHTML = '';
  const state = document.createElement('div');
  state.className = 'column-empty-state';
  const icon = document.createElement('i');
  icon.className = `fa ${options.icon || 'fa-circle-o'} column-empty-icon`;
  icon.setAttribute('aria-hidden', 'true');
  state.appendChild(icon);
  appendText(state, 'strong', 'column-empty-title', options.title || 'Nothing here yet');
  appendText(state, 'span', 'column-empty-text', options.text || 'Select an item to continue.');
  area.appendChild(state);
}

function renderWorkspace(area, options = {}) {
  if (!area) return;
  area.innerHTML = '';
  const card = document.createElement('section');
  card.className = 'workspace-empty-card';
  const iconWrap = document.createElement('div');
  iconWrap.className = 'workspace-empty-icon';
  const icon = document.createElement('i');
  icon.className = `fa ${options.icon || 'fa-shield'}`;
  icon.setAttribute('aria-hidden', 'true');
  iconWrap.appendChild(icon);
  card.appendChild(iconWrap);
  appendText(card, 'h1', 'workspace-empty-title', options.title || 'SafeLedger');
  appendText(card, 'p', 'workspace-empty-text', options.text || 'Select an item to continue.');

  if (Array.isArray(options.actions) && options.actions.length) {
    const actions = document.createElement('div');
    actions.className = 'workspace-empty-actions';
    for (const action of options.actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = action.className || 'btn btn-default';
      if (action.icon) {
        const actionIcon = document.createElement('i');
        actionIcon.className = `fa ${action.icon}`;
        actionIcon.setAttribute('aria-hidden', 'true');
        button.appendChild(actionIcon);
        button.appendChild(document.createTextNode(' '));
      }
      button.appendChild(document.createTextNode(action.label || 'Continue'));
      if (typeof action.onClick === 'function') button.addEventListener('click', action.onClick);
      actions.appendChild(button);
    }
    card.appendChild(actions);
  }
  area.appendChild(card);
}

exports.renderColumn = renderColumn;
exports.renderWorkspace = renderWorkspace;
exports._test = { appendText };
