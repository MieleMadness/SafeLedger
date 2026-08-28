/*
  Author: Edward Seufert - Cborgtech, LLC
*/

const { ipcRenderer: ipc } = require('electron');
const statusMgr = require('./status');
const record = require('./record');
const utils = require('./utils');
const securityUi = require('./security-ui');
const walletCatalog = require('./wallet-catalog');
const detailActions = require('./detail-actions');
const editFormUi = require('./edit-form-ui');
const recoveryReadiness = require('./recovery-readiness');
const recoveryDrillUi = require('./recovery-drill-ui');
const walletMetadata = require('./wallet-metadata');
const customFields = require('./custom-fields');
const customFieldsUi = require('./custom-fields-ui');

const normalize = (value) => String(value || '').trim().toLowerCase();

function displayWalletName(name) {
  return normalize(name) === 'base app (coinbase wallet)' ? 'Coinbase Wallet' : (name || '');
}

function getCatalogWallet(group) {
  const groupName = normalize(group && group.name);
  return walletCatalog.catalog.find((item) => {
    const catalogName = normalize(item.name);
    if (catalogName === groupName) return true;
    return catalogName === 'base app (coinbase wallet)' && groupName === 'coinbase wallet';
  });
}

function getWalletCategory(group) {
  if (group && group.category) return group.category;
  const catalogWallet = getCatalogWallet(group);
  return catalogWallet && catalogWallet.type ? `${catalogWallet.type} Wallet` : '';
}

function getUserWalletNotes(group) {
  if (!group) return '';
  const notes = String(group.notes || '');
  const catalogWallet = getCatalogWallet(group);
  if (!catalogWallet) return notes;
  const generated = `${catalogWallet.type} wallet. Support catalog reviewed 2026-08-19. Source: ${catalogWallet.source}`;
  return notes === generated ? '' : notes;
}

function formatEasternDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'short', day: '2-digit', year: 'numeric',
      hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
      timeZone: 'America/New_York', timeZoneName: 'short'
    }).format(date);
  } catch (_) {
    return String(value).replace('Eastern Daylight Time', 'EDT').replace('Eastern Standard Time', 'EST');
  }
}

function appendDetailLine(area, label, value, formatter) {
  if (value == null || value === '') return;
  const p = document.createElement('p');
  p.className = 'detail-info-line';
  const b = document.createElement('b');
  b.textContent = `${label}: `;
  p.appendChild(b);
  const span = document.createElement('span');
  span.textContent = formatter ? formatter(value) : value;
  p.appendChild(span);
  area.appendChild(p);
}

function persistWalletUpdate(params, updates, button, activityEvent) {
  if (params.saving.state) return alert('Please wait for processing to complete');
  Object.assign(params.group, updates || {});
  params.group.modified = Date();
  params.vaultData.groups[params.vaultData.groupSelected] = params.group;
  params.saving.state = true;
  if (button) button.disabled = true;
  statusMgr.loadStatus();
  ipc.send('process-group', { type: 'group-modify', vaultData: params.vaultData, activityEvent });
}

function renderReadinessCard(area, params) {
  const readiness = recoveryReadiness.calculateWalletReadiness(params.group);
  const card = document.createElement('section');
  card.className = 'recovery-readiness-card';
  card.setAttribute('aria-label', 'Recovery Readiness');

  const head = document.createElement('div');
  head.className = 'recovery-readiness-head';
  const title = document.createElement('div');
  title.className = 'recovery-readiness-title';
  title.textContent = 'Recovery Readiness';
  const score = document.createElement('div');
  score.className = 'recovery-readiness-score';
  score.textContent = `${readiness.score}%`;
  head.appendChild(title);
  head.appendChild(score);
  card.appendChild(head);

  const badge = document.createElement('div');
  badge.className = `recovery-readiness-status ${readiness.status === 'Ready' ? 'is-ready' : readiness.status === 'Needs Review' ? 'is-review' : 'is-incomplete'}`;
  badge.textContent = readiness.status;
  card.appendChild(badge);

  const message = document.createElement('p');
  message.className = 'recovery-readiness-message';
  message.textContent = readiness.message;
  card.appendChild(message);

  const meta = document.createElement('p');
  meta.className = 'recovery-readiness-meta';
  meta.textContent = params.group.lastVerified
    ? `Last verified: ${formatEasternDate(params.group.lastVerified)}`
    : 'Last verified: Never';
  card.appendChild(meta);

  const drillMeta = document.createElement('p');
  drillMeta.className = 'recovery-readiness-meta';
  drillMeta.textContent = params.group.lastRecoveryDrill
    ? `Last recovery drill: ${formatEasternDate(params.group.lastRecoveryDrill)}`
    : 'Last recovery drill: Never';
  card.appendChild(drillMeta);

  const actions = document.createElement('div');
  actions.className = 'recovery-readiness-actions';
  const verify = document.createElement('button');
  verify.type = 'button';
  verify.className = 'btn btn-default btn-sm';
  verify.innerHTML = '<i class="fa fa-check-circle"></i> Verify now';
  verify.addEventListener('click', () => {
    persistWalletUpdate(params, { lastVerified: new Date().toISOString() }, verify, 'recovery-verified');
  });
  actions.appendChild(verify);

  const drill = document.createElement('button');
  drill.type = 'button';
  drill.className = 'btn btn-default btn-sm';
  drill.innerHTML = '<i class="fa fa-shield"></i> Run recovery drill';
  drill.addEventListener('click', () => {
    if (params.saving.state) return alert('Please wait for processing to complete');
    recoveryDrillUi.render({
      group: params.group,
      walletName: displayWalletName(params.group.name) || 'Wallet',
      onCancel: () => renderGroupDetail(params),
      onComplete: (patch, button) => persistWalletUpdate(params, patch, button, 'recovery-drill-completed')
    });
  });
  actions.appendChild(drill);
  card.appendChild(actions);
  area.appendChild(card);
}

exports.listGroups = (params) => renderGroups(params);

const renderGroups = (params) => {
  const groupSearch = document.getElementById('groupSearch');
  const groupArea = document.getElementById('groupArea');
  groupArea.innerHTML = '';
  const ul = document.createElement('UL');
  ul.className = 'nav';

  if (params.vaultData && params.vaultData.groups) {
    const groupsArray = params.vaultData.groups;
    const displayGroups = groupsArray
      .map((group, index) => ({ group, index }))
      .sort((a, b) => normalize(displayWalletName(a.group.name)).localeCompare(normalize(displayWalletName(b.group.name))));
    const query = groupSearch && groupSearch.value ? groupSearch.value.toLowerCase() : '';

    for (const entry of displayGroups) {
      const i = entry.index;
      const current = entry.group;
      const category = getWalletCategory(current);
      const visibleName = displayWalletName(current.name) || 'Unnamed Wallet';
      const searchable = [visibleName, category, current.tags, ...walletMetadata.searchableValues(current), ...customFields.searchableValues(current.customFields), getUserWalletNotes(current)]
        .map((v) => String(v || '').toLowerCase()).join(' ');
      if (query && !searchable.includes(query)) continue;

      const li = document.createElement('LI');
      const href = document.createElement('A');
      href.addEventListener('click', (e) => {
        e.preventDefault();
        if (params.saving.state) return alert('Please wait for processing to complete');
        params.vaultData.groupSelected = i;
        params.vaultData.recordSelected = null;
        renderGroupDetail({ vaultData: params.vaultData, group: current, saving: params.saving });
        renderGroups({ vaultData: params.vaultData, saving: params.saving });
        record.listRecords({ vaultData: params.vaultData, saving: params.saving });
      });
      if (params.vaultData.groupSelected == i) href.className = 'item-selected';

      const icon = document.createElement('span');
      icon.className = 'glyphicon glyphicon-piggy-bank wallet-list-icon';
      href.appendChild(icon);
      const text = document.createElement('span');
      text.className = 'wallet-list-text';
      const name = document.createElement('span');
      name.className = 'wallet-list-name';
      name.textContent = visibleName;
      text.appendChild(name);
      if (category) {
        const sub = document.createElement('span');
        sub.className = 'wallet-list-category';
        sub.textContent = category;
        text.appendChild(sub);
      }
      href.appendChild(text);
      li.appendChild(href);
      ul.appendChild(li);
    }
    groupArea.appendChild(ul);
  } else groupArea.textContent = 'No items';
};

exports.createGroup = (params) => createEditGroup(params);

const createEditGroup = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = params.group ? 'Modify Wallet' : 'Add Wallet';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));

  const { form, grid } = editFormUi.createForm(area);
  const inputName = editFormUi.addTextInput(grid, {
    id: 'inputName', label: 'Name', value: params.group ? displayWalletName(params.group.name) : '', maxLength: 25
  });
  const inputCategory = editFormUi.addSelect(grid, {
    id: 'inputCategory', label: 'Wallet category', value: getWalletCategory(params.group) || '',
    options: ['', 'Hardware Wallet', 'Software Wallet', 'Other Wallet']
  });
  const metadataControls = walletMetadata.addEditFields(editFormUi, grid, params.group || {});
  const inputTags = editFormUi.addTextInput(grid, {
    id: 'inputTags', label: 'Tags (comma separated)', value: params.group && params.group.tags, maxLength: 250
  });
  const inputPassword = editFormUi.addTextInput(grid, {
    id: 'inputPassword', label: 'Password', value: params.group && params.group.password,
    sensitive: true, revealLabel: 'password'
  });
  const inputPin = editFormUi.addTextInput(grid, {
    id: 'inputPin', label: 'PIN code', value: params.group && params.group.pin,
    sensitive: true, revealLabel: 'PIN code'
  });
  const inputRecoveryLink = editFormUi.addTextInput(grid, {
    id: 'inputRecoveryLink', label: 'Recovery link', value: params.group && params.group.recoveryLink,
    sensitive: true, revealLabel: 'recovery link'
  });
  const inputSeedPhrase = editFormUi.addTextInput(grid, {
    id: 'inputSeedPhrase', label: 'Seed phrase', value: params.group && params.group.seedPhrase,
    sensitive: true, revealLabel: 'seed phrase'
  });
  const inputNotes = editFormUi.addTextarea(grid, {
    id: 'inputNotes', label: 'Notes', value: getUserWalletNotes(params.group),
    rows: 4, maxLength: 500, className: 'detail-notes-input', full: true
  });
  const customFieldEditor = customFieldsUi.createEditor(grid, params.group && params.group.customFields);

  const saveGroup = (button) => {
    if (params.saving.state) return alert('Please wait for processing to complete');
    if (!inputName.value) {
      if (button) button.disabled = false;
      return;
    }
    if (button) button.disabled = true;

    const g = params.group || { created: Date() };
    g.name = inputName.value;
    g.category = inputCategory.value;
    walletMetadata.applyEditFields(g, metadataControls);
    g.tags = inputTags.value;
    g.password = inputPassword.value;
    g.pin = inputPin.value;
    g.recoveryLink = inputRecoveryLink.value;
    g.seedPhrase = inputSeedPhrase.value;
    g.notes = inputNotes.value;
    g.customFields = customFieldEditor.getFields();
    if (params.group) g.modified = Date();

    if (params.group) params.vaultData.groups[params.vaultData.groupSelected] = g;
    else params.vaultData.groups.push(g);
    params.vaultData.groups.sort(utils.compareIgnoreCase);
    params.vaultData.groupSelected = params.vaultData.groups.indexOf(g);
    params.saving.state = true;
    statusMgr.loadStatus();
    ipc.send('process-group', {
      type: params.group ? 'group-modify' : 'group-create',
      vaultData: params.vaultData
    });
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveGroup(null);
  });
  detailActions.set([
    { icon: 'fa-save', title: 'Save wallet', className: 'detail-action-save', onClick: (_event, button) => saveGroup(button) }
  ]);
};

exports.showGroupDetail = (params) => renderGroupDetail(params);

const renderGroupDetail = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.className = 'wallet-detail-title';
  header.textContent = displayWalletName(params.group.name) || 'Wallet';
  area.appendChild(header);
  const category = getWalletCategory(params.group);
  if (category) {
    const sub = document.createElement('div');
    sub.className = 'wallet-detail-category';
    sub.textContent = category;
    area.appendChild(sub);
  }
  area.appendChild(document.createElement('hr'));

  renderReadinessCard(area, params);
  walletMetadata.appendDetail(area, params.group, appendDetailLine);
  appendDetailLine(area, 'Tags', params.group.tags);

  securityUi.appendSensitiveField(area, 'Password', params.group.password || '', { allowQr: false });
  securityUi.appendSensitiveField(area, 'PIN code', params.group.pin || '', { allowQr: false });
  securityUi.appendSensitiveField(area, 'Recovery link', params.group.recoveryLink || '', { allowQr: false });
  securityUi.appendSensitiveField(area, 'Seed phrase', params.group.seedPhrase || '', { allowQr: false });
  customFieldsUi.appendDetail(area, params.group.customFields, (label, value) => appendDetailLine(area, label, value));

  const notesWrap = document.createElement('div');
  notesWrap.className = 'detail-notes-section';
  const notesLabel = document.createElement('b');
  notesLabel.textContent = 'Notes:';
  notesWrap.appendChild(notesLabel);
  const notesValue = document.createElement('div');
  notesValue.className = 'outData detail-notes-value';
  notesValue.textContent = getUserWalletNotes(params.group);
  notesWrap.appendChild(notesValue);
  area.appendChild(notesWrap);

  appendDetailLine(area, 'Created', params.group.created, formatEasternDate);
  appendDetailLine(area, 'Modified', params.group.modified, formatEasternDate);

  detailActions.set([
    { icon: 'fa-pencil', title: 'Edit wallet', onClick: () => createEditGroup(params) },
    {
      icon: 'fa-print', title: 'Print recovery sheet', className: 'detail-action-print',
      onClick: () => securityUi.printRecoverySheet(`${displayWalletName(params.group.name) || 'Wallet'} Recovery Sheet`, [
        { label: 'Wallet', value: displayWalletName(params.group.name) },
        { label: 'Category', value: category },
        ...walletMetadata.printFields(params.group),
        { label: 'Tags', value: params.group.tags },
        { label: 'Password', value: params.group.password },
        { label: 'PIN', value: params.group.pin },
        { label: 'Recovery link', value: params.group.recoveryLink },
        { label: 'Seed phrase', value: params.group.seedPhrase },
        ...customFields.printFields(params.group.customFields),
        { label: 'Last verified', value: params.group.lastVerified ? formatEasternDate(params.group.lastVerified) : 'Never' },
        { label: 'Last recovery drill', value: params.group.lastRecoveryDrill ? formatEasternDate(params.group.lastRecoveryDrill) : 'Never' },
        { label: 'Notes', value: getUserWalletNotes(params.group) }
      ], true)
    },
    { icon: 'fa-trash', title: 'Delete wallet', className: 'detail-action-delete', onClick: () => confirmDelete(params) }
  ]);
};

const confirmDelete = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = `Confirm Delete of wallet: ${displayWalletName(params.group.name)}`;
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));
  const note = document.createElement('p');
  note.textContent = 'Use the red trash icon below to permanently delete this wallet.';
  area.appendChild(note);
  detailActions.set([
    { icon: 'fa-times', title: 'Cancel delete wallet', className: 'detail-action-cancel', onClick: () => renderGroupDetail(params) },
    {
      icon: 'fa-trash', title: 'Confirm delete wallet', className: 'detail-action-delete',
      onClick: () => {
        params.vaultData.groups.splice(params.vaultData.groupSelected, 1);
        params.vaultData.groupSelected = null;
        params.vaultData.recordSelected = null;
        params.saving.state = true;
        statusMgr.loadStatus();
        ipc.send('process-group', { type: 'group-delete', vaultData: params.vaultData });
        area.innerHTML = '';
        detailActions.clear();
      }
    }
  ]);
};
