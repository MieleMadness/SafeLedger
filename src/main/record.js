/*
  Author: Edward Seufert - Cborgtech, LLC
*/

const { ipcRenderer: ipc } = require('electron');
const statusMgr = require('./status');
const utils = require('./utils');
const securityUi = require('./security-ui');
const walletCatalog = require('./wallet-catalog');
const tokenIcons = require('./token-icons');
const detailActions = require('./detail-actions');
const editFormUi = require('./edit-form-ui');
const customFields = require('./custom-fields');
const customFieldsUi = require('./custom-fields-ui');
const emptyState = require('./empty-state-ui');

const normalize = (v) => String(v || '').trim().toLowerCase();

const getUserCoinNotes = (vaultData, rec) => {
  const wallet = vaultData && vaultData.groupSelected != null ? vaultData.groups[vaultData.groupSelected] : null;
  const catalogWallet = walletCatalog.catalog.find((w) => normalize(w.name) === normalize(wallet && wallet.name));
  if (!catalogWallet) return rec && rec.notes || '';
  const catalogRecord = catalogWallet.records.find(([name, symbol]) =>
    (normalize(symbol) && normalize(symbol) === normalize(rec && rec.symbol)) || normalize(name) === normalize(rec && rec.name)
  );
  return catalogRecord && catalogRecord[2] === rec.notes ? '' : (rec && rec.notes || '');
};

const formatEasternDate = (value) => {
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
};

const appendCoinHeader = (area, record) => {
  const header = document.createElement('div');
  header.className = 'coin-detail-header';
  const symbol = String(record.symbol || '').toUpperCase();
  const brandedIcon = tokenIcons.createIconElement(record, 'coin-brand-image');
  if (brandedIcon) header.appendChild(brandedIcon);
  else {
    const fallback = document.createElement('div');
    fallback.className = 'coin-brand-icon coin-brand-generic';
    fallback.textContent = symbol ? symbol.slice(0, 3) : '•';
    header.appendChild(fallback);
  }
  const titleWrap = document.createElement('div');
  titleWrap.className = 'coin-detail-title-wrap';
  const title = document.createElement('h1');
  title.textContent = record.name || 'Coin';
  titleWrap.appendChild(title);
  if (symbol) {
    const symbolLine = document.createElement('div');
    symbolLine.className = 'coin-detail-symbol';
    symbolLine.textContent = symbol;
    titleWrap.appendChild(symbolLine);
  }
  header.appendChild(titleWrap);
  area.appendChild(header);
};

function assetSort(a, b) {
  const aPinned = a.record && a.record.pinned === true;
  const bPinned = b.record && b.record.pinned === true;
  if (aPinned !== bPinned) return aPinned ? -1 : 1;
  return String(a.record && a.record.name || '').localeCompare(String(b.record && b.record.name || ''), undefined, { sensitivity: 'base' });
}

exports.listRecords = (params) => renderRecords(params);

const renderRecords = (params) => {
  const recordSearch = document.getElementById('recordSearch');
  const recordArea = document.getElementById('recordArea');
  recordArea.innerHTML = '';

  if (!params.vaultData || params.vaultData.groupSelected == null) {
    emptyState.renderColumn(recordArea, {
      icon: 'fa-circle-o',
      title: 'Select a wallet',
      text: 'Assets appear after a Wallet is selected.'
    });
    return;
  }

  const wallet = params.vaultData.groups[params.vaultData.groupSelected];
  const records = wallet && Array.isArray(wallet.records) ? wallet.records : [];
  if (!records.length) {
    emptyState.renderColumn(recordArea, {
      icon: 'fa-circle-o',
      title: 'No assets yet',
      text: 'Add an Asset to document addresses, keys, and recovery details.'
    });
    return;
  }

  const ul = document.createElement('UL');
  ul.className = 'nav';
  const sorted = records.map((record, originalIndex) => ({ record, originalIndex })).sort(assetSort);
  const query = recordSearch && recordSearch.value ? recordSearch.value.toLowerCase() : '';
  let visibleCount = 0;

  for (const entry of sorted) {
    const coin = entry.record;
    const i = entry.originalIndex;
    const searchable = [coin.name, coin.symbol, coin.publicAddress, getUserCoinNotes(params.vaultData, coin), coin.tags, ...customFields.searchableValues(coin.customFields)]
      .map((v) => String(v || '').toLowerCase()).join(' ');
    if (query && !searchable.includes(query)) continue;
    visibleCount++;

    const li = document.createElement('LI');
    const href = document.createElement('A');
    href.addEventListener('click', (e) => {
      e.preventDefault();
      if (params.saving.state) return alert('Please wait for processing to complete');
      params.vaultData.recordSelected = i;
      renderRecordDetail({ vaultData: params.vaultData, record: coin, saving: params.saving });
      renderRecords(params);
    });
    if (params.vaultData.recordSelected == i) href.className = 'item-selected';

    const row = document.createElement('span');
    row.className = 'coin-list-row';
    const brandedIcon = tokenIcons.createIconElement(coin, 'coin-list-brand-image');
    if (brandedIcon) row.appendChild(brandedIcon);
    else {
      const generic = document.createElement('span');
      generic.className = 'coin-list-generic-icon';
      generic.textContent = String(coin.symbol || '').toUpperCase().slice(0, 2) || '•';
      row.appendChild(generic);
    }
    const text = document.createElement('span');
    text.className = 'coin-list-label';
    text.textContent = `${coin.name || 'Unnamed'}${coin.symbol ? ` (${coin.symbol})` : ''}`;
    row.appendChild(text);
    if (coin.pinned === true) {
      const pin = document.createElement('i');
      pin.className = 'fa fa-star pin-indicator';
      pin.setAttribute('title', 'Pinned');
      pin.setAttribute('aria-label', 'Pinned');
      row.appendChild(pin);
    }
    href.appendChild(row);
    li.appendChild(href);
    ul.appendChild(li);
  }

  if (!visibleCount) {
    emptyState.renderColumn(recordArea, {
      icon: 'fa-search',
      title: 'No matching assets',
      text: 'Try a different asset search term.'
    });
    return;
  }
  recordArea.appendChild(ul);
};

exports.createRecord = (params) => createEditRecord(params);

const createEditRecord = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = params.record ? 'Modify Coin' : 'Add Coin';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));

  const { form, grid } = editFormUi.createForm(area);
  const inputName = editFormUi.addTextInput(grid, {
    id: 'inputName', label: 'Coin', value: params.record && params.record.name, maxLength: 25
  });
  const inputSymbol = editFormUi.addTextInput(grid, {
    id: 'inputSymbol', label: 'Symbol', value: params.record && params.record.symbol, maxLength: 30
  });
  const inputPublicAddress = editFormUi.addTextInput(grid, {
    id: 'inputPublicAddress', label: 'Public address', value: params.record && params.record.publicAddress
  });
  const inputPrivateAddress = editFormUi.addTextInput(grid, {
    id: 'inputPrivateAddress', label: 'Private key', value: params.record && params.record.privateAddress,
    sensitive: true, revealLabel: 'private key'
  });
  const inputTags = editFormUi.addTextInput(grid, {
    id: 'inputTags', label: 'Tags (comma separated)', value: params.record && params.record.tags, maxLength: 250
  });
  const inputBalance = editFormUi.addTextInput(grid, {
    id: 'inputManualBalance', label: 'Balance', value: params.record && params.record.manualBalance,
    maxLength: 100, sensitive: true, revealLabel: 'balance'
  });
  const inputNotes = editFormUi.addTextarea(grid, {
    id: 'inputNotes', label: 'Notes', value: getUserCoinNotes(params.vaultData, params.record),
    rows: 4, maxLength: 500, className: 'detail-notes-input', full: true
  });
  const customFieldEditor = customFieldsUi.createEditor(grid, params.record && params.record.customFields);

  const saveRecord = (button) => {
    if (params.saving.state) return alert('Please wait for processing to complete');
    if (!inputName.value) {
      if (button) button.disabled = false;
      return;
    }
    if (button) button.disabled = true;
    params.saving.state = true;
    statusMgr.loadStatus();

    const rec = params.record || { created: Date() };
    rec.name = inputName.value;
    rec.symbol = inputSymbol.value;
    rec.publicAddress = inputPublicAddress.value;
    rec.privateAddress = inputPrivateAddress.value;
    rec.tags = inputTags.value;
    rec.manualBalance = inputBalance.value;
    rec.balanceUpdated = inputBalance.value ? new Date().toISOString() : (rec.balanceUpdated || '');
    rec.notes = inputNotes.value;
    rec.customFields = customFieldEditor.getFields();
    if (params.record) rec.modified = Date();

    const records = params.vaultData.groups[params.vaultData.groupSelected].records ||
      (params.vaultData.groups[params.vaultData.groupSelected].records = []);
    if (params.record) records[params.vaultData.recordSelected] = rec;
    else records.push(rec);
    records.sort(utils.compareIgnoreCase);
    params.vaultData.recordSelected = records.indexOf(rec);
    ipc.send('process-record', {
      action: params.record ? 'modify' : 'create',
      vaultData: params.vaultData
    });
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveRecord(null);
  });
  detailActions.set([
    { icon: 'fa-save', title: 'Save coin', className: 'detail-action-save', onClick: (_event, button) => saveRecord(button) }
  ]);
};

function persistRecordUpdate(params, updates, button) {
  if (params.saving.state) return alert('Please wait for processing to complete');
  Object.assign(params.record, updates || {});
  params.record.modified = Date();
  const records = params.vaultData.groups[params.vaultData.groupSelected].records;
  records[params.vaultData.recordSelected] = params.record;
  params.saving.state = true;
  if (button) button.disabled = true;
  statusMgr.loadStatus();
  ipc.send('process-record', { action: 'modify', vaultData: params.vaultData });
}

exports.showRecordDetail = (params) => renderRecordDetail(params);

const renderRecordDetail = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  appendCoinHeader(area, params.record);
  area.appendChild(document.createElement('hr'));

  const addLine = (label, value, formatter) => {
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
  };

  addLine('Symbol', params.record.symbol);
  addLine('Tags', params.record.tags);
  if (String(params.record.manualBalance || '').trim()) {
    securityUi.appendSensitiveField(area, 'Balance', params.record.manualBalance, {
      allowQr: false,
      meta: params.record.balanceUpdated ? {
        label: 'Balance updated',
        value: formatEasternDate(params.record.balanceUpdated)
      } : null
    });
  }

  securityUi.appendPublicAddressField(area, params.record.publicAddress || '', params.record.symbol || '');
  if (!params.record.publicAddress) {
    const placeholder = area.querySelector('.public-address-field .public-address-value');
    if (placeholder) {
      placeholder.textContent = 'Use edit button to update asset.';
      placeholder.classList.add('public-address-placeholder');
    }
  }
  if (String(params.record.privateAddress || '').trim()) {
    securityUi.appendSensitiveField(area, 'Private key', params.record.privateAddress);
  }
  customFieldsUi.appendDetail(area, params.record.customFields, addLine);

  const notesWrap = document.createElement('div');
  notesWrap.className = 'detail-notes-section';
  const notesLabel = document.createElement('b');
  notesLabel.textContent = 'Notes:';
  notesWrap.appendChild(notesLabel);
  const notesValue = document.createElement('div');
  notesValue.className = 'outData detail-notes-value';
  notesValue.textContent = getUserCoinNotes(params.vaultData, params.record);
  notesWrap.appendChild(notesValue);
  area.appendChild(notesWrap);

  addLine('Created', params.record.created, formatEasternDate);
  addLine('Modified', params.record.modified, formatEasternDate);

  const printIncludesSensitive = !!String(params.record.privateAddress || '').trim() || !!String(params.record.manualBalance || '').trim() || customFields.hasSensitive(params.record.customFields);
  detailActions.set([
    {
      icon: params.record.pinned === true ? 'fa-star' : 'fa-star-o',
      title: params.record.pinned === true ? 'Unpin asset' : 'Pin asset',
      className: 'detail-action-pin',
      onClick: (_event, button) => persistRecordUpdate(params, { pinned: params.record.pinned !== true }, button)
    },
    { icon: 'fa-pencil', title: 'Edit coin', onClick: () => createEditRecord(params) },
    {
      icon: 'fa-print', title: 'Print coin sheet', className: 'detail-action-print',
      onClick: () => securityUi.printRecoverySheet(`${params.record.name || 'Coin'} Recovery Sheet`, [
        { label: 'Coin', value: params.record.name },
        { label: 'Symbol', value: params.record.symbol },
        { label: 'Tags', value: params.record.tags },
        { label: 'Public address', value: params.record.publicAddress },
        { label: 'Private key', value: params.record.privateAddress },
        { label: 'Balance', value: params.record.manualBalance },
        { label: 'Balance updated', value: params.record.balanceUpdated },
        ...customFields.printFields(params.record.customFields),
        { label: 'Notes', value: getUserCoinNotes(params.vaultData, params.record) }
      ], printIncludesSensitive)
    },
    { icon: 'fa-trash', title: 'Delete coin', className: 'detail-action-delete', onClick: () => confirmDelete(params) }
  ]);
};

const confirmDelete = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = `Confirm Delete of coin: ${params.record.name}`;
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));
  const note = document.createElement('p');
  note.textContent = 'Use the red trash icon below to permanently delete this coin from the wallet.';
  area.appendChild(note);
  detailActions.set([
    { icon: 'fa-times', title: 'Cancel delete coin', className: 'detail-action-cancel', onClick: () => renderRecordDetail(params) },
    {
      icon: 'fa-trash', title: 'Confirm delete coin', className: 'detail-action-delete',
      onClick: () => {
        params.vaultData.groups[params.vaultData.groupSelected].records.splice(params.vaultData.recordSelected, 1);
        params.vaultData.recordSelected = null;
        params.saving.state = true;
        statusMgr.loadStatus();
        ipc.send('process-record', { action: 'delete', vaultData: params.vaultData });
        area.innerHTML = '';
        detailActions.clear();
      }
    }
  ]);
};

exports._test = { assetSort, getUserCoinNotes, formatEasternDate };
