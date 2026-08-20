/*
  Author: Edward Seufert - Cborgtech, LLC
*/

const electron = require('electron');
const remote = electron.remote;
const {ipcRenderer : ipc } = electron;
const statusMgr = require('./status');
const con = remote.getGlobal('console');
const record = require('./record');
const utils = require('./utils');
const securityUi = require('./security-ui');
const walletCatalog = require('./wallet-catalog');

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
      const searchable = [visibleName, category, current.tags, getUserWalletNotes(current)]
        .map((v) => String(v || '').toLowerCase()).join(' ');
      if (query && !searchable.includes(query)) continue;

      const li = document.createElement('LI');
      const href = document.createElement('A');
      href.addEventListener('click', (e) => {
        e.preventDefault();
        if (params.saving.state) return alert('Please wait for processing to complete');
        params.vaultData.groupSelected = i;
        params.vaultData.recordSelected = null;
        renderGroupDetail({cryptoKey:params.cryptoKey,vaultData:params.vaultData,group:current,saving:params.saving});
        renderGroups({cryptoKey:params.cryptoKey,vaultData:params.vaultData,groups:params.vaultData.groups,saving:params.saving});
        record.listRecords({cryptoKey:params.cryptoKey,vaultData:params.vaultData,records:current.records,saving:params.saving});
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
  } else groupArea.innerHTML = 'No items';
};

exports.createGroup = (params) => createEditGroup(params);

const createSensitiveInput = (form, id, labelText, value) => {
  const formGroup = document.createElement('div'); formGroup.className='form-group'; form.appendChild(formGroup);
  const label = document.createElement('label'); label.for=id; label.textContent=labelText; formGroup.appendChild(label);
  const input = document.createElement('input'); input.type='password'; input.className='form-control'; input.id=id; input.maxLength=500; input.value=value||''; formGroup.appendChild(input);
  securityUi.addSensitiveInputControls(input, formGroup, labelText.toLowerCase());
  return input;
};

const createEditGroup = (params) => {
  const area=document.getElementById('detailArea'); area.innerHTML='';
  const header=document.createElement('h1'); header.textContent=params.group?'Modify Wallet':'Add Wallet'; area.appendChild(header); area.appendChild(document.createElement('hr'));
  const form=document.createElement('form'); area.appendChild(form);
  const general=document.createElement('div'); general.className='form-group'; form.appendChild(general);

  const labelName=document.createElement('label'); labelName.for='inputName'; labelName.textContent='Name'; general.appendChild(labelName);
  const inputName=document.createElement('input'); inputName.type='text'; inputName.className='form-control'; inputName.id='inputName'; inputName.maxLength=25; inputName.value=params.group?displayWalletName(params.group.name):''; general.appendChild(inputName);

  const categoryLabel=document.createElement('label'); categoryLabel.for='inputCategory'; categoryLabel.textContent='Wallet category'; general.appendChild(categoryLabel);
  const inputCategory=document.createElement('select'); inputCategory.className='form-control'; inputCategory.id='inputCategory';
  ['', 'Hardware Wallet', 'Software Wallet', 'Other Wallet'].forEach((value) => {
    const option=document.createElement('option'); option.value=value; option.textContent=value || 'Not specified'; inputCategory.appendChild(option);
  });
  inputCategory.value=getWalletCategory(params.group)||''; general.appendChild(inputCategory);

  const labelTags=document.createElement('label'); labelTags.for='inputTags'; labelTags.textContent='Tags (comma separated)'; general.appendChild(labelTags);
  const inputTags=document.createElement('input'); inputTags.type='text'; inputTags.className='form-control'; inputTags.id='inputTags'; inputTags.maxLength=250; inputTags.value=(params.group&&params.group.tags)||''; general.appendChild(inputTags);

  const inputPassword=createSensitiveInput(form,'inputPassword','Password',params.group&&params.group.password);
  const inputPin=createSensitiveInput(form,'inputPin','PIN code',params.group&&params.group.pin);
  const inputRecoveryLink=createSensitiveInput(form,'inputRecoveryLink','Recovery link',params.group&&params.group.recoveryLink);
  const inputSeedPhrase=createSensitiveInput(form,'inputSeedPhrase','Seed phrase',params.group&&params.group.seedPhrase);

  const notesGroup=document.createElement('div'); notesGroup.className='form-group'; form.appendChild(notesGroup);
  const labelNotes=document.createElement('label'); labelNotes.for='inputNotes'; labelNotes.textContent='Notes'; notesGroup.appendChild(labelNotes);
  const inputNotes=document.createElement('textarea'); inputNotes.rows=5; inputNotes.className='form-control'; inputNotes.id='inputNotes'; inputNotes.maxLength=500; inputNotes.value=getUserWalletNotes(params.group); notesGroup.appendChild(inputNotes);

  const saveBtn=document.createElement('button'); saveBtn.type='submit'; saveBtn.className='btn btn-default bottom-space pull-right'; saveBtn.innerHTML="<span class='glyphicon glyphicon-save'></span> Save";
  saveBtn.addEventListener('click',(e)=>{
    e.preventDefault(); if(params.saving.state)return alert('Please wait for processing to complete'); if(!inputName.value)return;
    const g=params.group||{created:Date()};
    g.name=inputName.value; g.category=inputCategory.value; g.tags=inputTags.value; g.password=inputPassword.value; g.pin=inputPin.value; g.recoveryLink=inputRecoveryLink.value; g.seedPhrase=inputSeedPhrase.value; g.notes=inputNotes.value; if(params.group)g.modified=Date();
    if(params.group)params.vaultData.groups[params.vaultData.groupSelected]=g; else params.vaultData.groups.push(g);
    params.vaultData.groups.sort(utils.compareIgnoreCase); params.vaultData.groupSelected=params.vaultData.groups.indexOf(g); params.saving.state=true; statusMgr.loadStatus();
    ipc.send('process-group',{cryptoKey:params.cryptoKey,type:params.group?'group-modify':'group-create',vaultData:params.vaultData});
  });
  form.appendChild(saveBtn);
};

exports.showGroupDetail = (params) => renderGroupDetail(params);

const renderGroupDetail = (params) => {
  const area=document.getElementById('detailArea'); area.innerHTML='';
  const header=document.createElement('h1'); header.textContent=displayWalletName(params.group.name)||'Wallet'; area.appendChild(header);
  const category=getWalletCategory(params.group);
  if(category){const sub=document.createElement('div');sub.className='wallet-detail-category';sub.textContent=category;area.appendChild(sub);}
  area.appendChild(document.createElement('hr'));
  if(params.group.tags){const tags=document.createElement('p'); tags.innerHTML='<b>Tags:</b> '; const span=document.createElement('span'); span.textContent=params.group.tags; tags.appendChild(span); area.appendChild(tags);}
  securityUi.appendSensitiveField(area,'Password',params.group.password||'');
  securityUi.appendSensitiveField(area,'PIN code',params.group.pin||'');
  securityUi.appendSensitiveField(area,'Recovery link',params.group.recoveryLink||'');
  securityUi.appendSensitiveField(area,'Seed phrase',params.group.seedPhrase||'');
  const notes=document.createElement('p'); notes.innerHTML='<b>Notes:</b>'; area.appendChild(notes);
  const notesDetail=document.createElement('div'); notesDetail.className='outData'; notesDetail.textContent=getUserWalletNotes(params.group); area.appendChild(notesDetail);
  const created=document.createElement('p'); created.className='dates'; created.innerHTML=`<b>Created:</b> ${params.group.created||''}`; area.appendChild(created);
  if(params.group.modified){const modified=document.createElement('p'); modified.className='dates'; modified.innerHTML=`<b>Modified:</b> ${params.group.modified}`; area.appendChild(modified);}

  const printBtn=document.createElement('button'); printBtn.type='button'; printBtn.className='btn btn-default bottom-space coin-print-button'; printBtn.innerHTML="<i class='fa fa-print'></i> Print recovery sheet";
  printBtn.addEventListener('click',()=>securityUi.printRecoverySheet(`${displayWalletName(params.group.name)||'Wallet'} Recovery Sheet`,[
    {label:'Wallet',value:displayWalletName(params.group.name)},{label:'Category',value:category},{label:'Tags',value:params.group.tags},{label:'Password',value:params.group.password},{label:'PIN',value:params.group.pin},{label:'Recovery link',value:params.group.recoveryLink},{label:'Seed phrase',value:params.group.seedPhrase},{label:'Notes',value:getUserWalletNotes(params.group)}
  ],true)); area.appendChild(printBtn);

  const deleteBtn=document.createElement('button'); deleteBtn.type='button'; deleteBtn.className='btn btn-default bottom-space pull-right coin-delete-button'; deleteBtn.innerHTML="<span class='glyphicon glyphicon-trash'></span> Delete"; deleteBtn.onclick=()=>confirmDelete(params); area.appendChild(deleteBtn);
  const editBtn=document.createElement('button'); editBtn.type='button'; editBtn.className='btn btn-default bottom-space pull-right'; editBtn.innerHTML="<span class='glyphicon glyphicon-edit'></span> Edit"; editBtn.onclick=()=>createEditGroup(params); area.appendChild(editBtn);
};

const confirmDelete = (params) => {
  const area=document.getElementById('detailArea'); area.innerHTML='';
  const header=document.createElement('h1'); header.textContent=`Confirm Delete of wallet: ${displayWalletName(params.group.name)}`; area.appendChild(header); area.appendChild(document.createElement('hr'));
  const btn=document.createElement('button'); btn.type='button'; btn.className='btn btn-default bottom-space pull-right coin-delete-button'; btn.textContent='Confirm Delete';
  btn.onclick=()=>{params.vaultData.groups.splice(params.vaultData.groupSelected,1); params.vaultData.groupSelected=null; params.vaultData.recordSelected=null; params.saving.state=true; statusMgr.loadStatus(); ipc.send('process-group',{cryptoKey:params.cryptoKey,type:'group-delete',vaultData:params.vaultData}); area.innerHTML='';}; area.appendChild(btn);
};
