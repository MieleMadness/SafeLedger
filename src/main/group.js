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

exports.listGroups = (params) => {
  renderGroups(params);
};

const renderGroups = (params) => {
  const groupSearch = document.getElementById('groupSearch');
  const groupArea = document.getElementById('groupArea');
  groupArea.innerHTML = "";
  const ul = document.createElement("UL");
  ul.className = "nav";
  if (params.vaultData != null && params.vaultData.groups != null) {
    const groupsArray = params.vaultData.groups;
    for (let i = 0; i < groupsArray.length; i++) {
      const groupName = (groupsArray[i].name || '').toLowerCase();
      if (groupSearch != null && groupSearch.value.length > 0 &&
        !(groupName.startsWith(groupSearch.value.toLowerCase())) ){
        continue;
      }
      const li = document.createElement("LI");
      ul.appendChild(li);
      const href = document.createElement("A");
      href.addEventListener('click', (e) => {
        e.preventDefault();
        if (params.saving.state == true) {
          alert("Please wait for processing to complete");
        } else {
          params.vaultData.groupSelected = i;
          params.vaultData.recordSelected = null;
          renderGroupDetail({cryptoKey:params.cryptoKey,vaultData:params.vaultData,group:groupsArray[i],saving:params.saving});
          renderGroups({cryptoKey:params.cryptoKey,vaultData:params.vaultData,groups:params.vaultData.groups,saving:params.saving});
          record.listRecords({cryptoKey:params.cryptoKey,vaultData:params.vaultData,records:groupsArray[i].records,saving:params.saving});
        }
      });
      if (params.vaultData.groupSelected != null && params.vaultData.groupSelected == i) href.className = "item-selected";
      href.innerHTML = "<span class='glyphicon glyphicon-piggy-bank' aria-hidden='true'></span> "+(groupsArray[i].name || 'Unnamed Wallet');
      li.appendChild(href);
    }
    groupArea.appendChild(ul);
  } else {
    groupArea.innerHTML = "No items";
  }
};

exports.createGroup = (params) => {
  createEditGroup(params);
};

const createSensitiveInput = (form, id, labelText, value) => {
  const formGroup = document.createElement('div');
  formGroup.className = 'form-group';
  form.appendChild(formGroup);

  const label = document.createElement('label');
  label.for = id;
  label.textContent = labelText;
  formGroup.appendChild(label);

  const input = document.createElement('input');
  input.type = 'password';
  input.className = 'form-control';
  input.id = id;
  input.setAttribute('maxlength', '500');
  input.value = value || '';
  formGroup.appendChild(input);
  securityUi.addSensitiveInputControls(input, formGroup, labelText.toLowerCase());
  return input;
};

const createEditGroup = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = "";
  const header = document.createElement('h1');
  header.textContent = params.group != null ? "Modify Wallet" : "Add Wallet";
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));
  const form = document.createElement('form');
  area.appendChild(form);

  const formGroupName = document.createElement('div');
  formGroupName.className = "form-group";
  form.appendChild(formGroupName);
  const label = document.createElement('label');
  label.for = "inputName";
  label.textContent = "Name";
  formGroupName.appendChild(label);
  const inputName = document.createElement('input');
  inputName.type = "text";
  inputName.className = "form-control";
  inputName.id = "inputName";
  inputName.setAttribute('maxlength','25');
  if (params.group != null) inputName.value = params.group.name || '';
  formGroupName.appendChild(inputName);

  const inputPassword = createSensitiveInput(form, 'inputPassword', 'Password', params.group && params.group.password);
  const inputPin = createSensitiveInput(form, 'inputPin', 'PIN code', params.group && params.group.pin);
  const inputRecoveryLink = createSensitiveInput(form, 'inputRecoveryLink', 'Recovery link', params.group && params.group.recoveryLink);
  const inputSeedPhrase = createSensitiveInput(form, 'inputSeedPhrase', 'Seed phrase', params.group && params.group.seedPhrase);

  const formGroupNotes = document.createElement('div');
  formGroupNotes.className = "form-group";
  form.appendChild(formGroupNotes);
  const labelNotes = document.createElement('label');
  labelNotes.for = "inputNotes";
  labelNotes.textContent = "Notes";
  formGroupNotes.appendChild(labelNotes);
  const inputNotes = document.createElement('textarea');
  inputNotes.rows = "5";
  inputNotes.className = "form-control";
  inputNotes.id = "inputNotes";
  inputNotes.setAttribute('maxlength','500');
  if (params.group != null && params.group.notes != null) inputNotes.value = params.group.notes;
  formGroupNotes.appendChild(inputNotes);

  const saveBtn = document.createElement('button');
  saveBtn.type = "submit";
  saveBtn.id = "saveBtn";
  saveBtn.className = "btn btn-default bottom-space pull-right";
  saveBtn.innerHTML = "<span class='glyphicon glyphicon-save' aria-hidden='true'></span> Save";
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (params.saving.state == true) {
      alert("Please wait for processing to complete");
      return;
    }
    saveBtn.disabled = true;
    if (!inputName.value) {
      saveBtn.disabled = false;
      return;
    }

    if (params.group != null) {
      params.group.name = inputName.value;
      params.group.password = inputPassword.value;
      params.group.pin = inputPin.value;
      params.group.recoveryLink = inputRecoveryLink.value;
      params.group.seedPhrase = inputSeedPhrase.value;
      params.group.notes = inputNotes.value;
      params.group.modified = Date();
      params.vaultData.groups[params.vaultData.groupSelected] = params.group;
      params.vaultData.groups.sort(utils.compareIgnoreCase);
      params.vaultData.groupSelected = params.vaultData.groups.indexOf(params.group);
      params.saving.state = true;
      statusMgr.loadStatus();
      ipc.send('process-group', {cryptoKey:params.cryptoKey,type:"group-modify",vaultData:params.vaultData});
    } else {
      const myGroup = {
        name: inputName.value,
        password: inputPassword.value,
        pin: inputPin.value,
        recoveryLink: inputRecoveryLink.value,
        seedPhrase: inputSeedPhrase.value,
        notes: inputNotes.value,
        created: Date()
      };
      params.vaultData.groups.push(myGroup);
      params.vaultData.groups.sort(utils.compareIgnoreCase);
      params.vaultData.groupSelected = params.vaultData.groups.indexOf(myGroup);
      params.saving.state = true;
      statusMgr.loadStatus();
      ipc.send('process-group', {cryptoKey:params.cryptoKey,type:"group-create",vaultData:params.vaultData});
    }
  });
  form.appendChild(saveBtn);
};

exports.showGroupDetail = (params) => {
  renderGroupDetail(params);
};

const renderGroupDetail = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = "";
  const header = document.createElement('h1');
  header.textContent = params.group.name || 'Wallet';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));

  // Every sensitive field is independently collapsed by default.
  securityUi.appendSensitiveField(area, 'Password', params.group.password || '');
  securityUi.appendSensitiveField(area, 'PIN code', params.group.pin || '');
  securityUi.appendSensitiveField(area, 'Recovery link', params.group.recoveryLink || '');
  securityUi.appendSensitiveField(area, 'Seed phrase', params.group.seedPhrase || '');

  const notes = document.createElement('p');
  notes.innerHTML = "<b>Notes:</b> ";
  area.appendChild(notes);
  const notesDetail = document.createElement('p');
  if (params.group.notes != null) {
    const r = params.group.notes.replace(/(?:\r\n|\r|\n)/g, '<br />');
    notesDetail.innerHTML = "<div class='outData'>"+r+"</div>";
  }
  area.appendChild(notesDetail);

  const created = document.createElement('p');
  created.className = "dates";
  created.innerHTML = "<b>Created:</b> "+(params.group.created || '');
  area.appendChild(created);
  const modified = document.createElement('p');
  modified.className = "dates";
  if (params.group.modified != null) modified.innerHTML = "<b>Modified:</b> "+params.group.modified;
  area.appendChild(modified);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = "button";
  deleteBtn.id = "deleteBtn";
  deleteBtn.className = "btn btn-default bottom-space pull-right";
  deleteBtn.innerHTML = "<span class='glyphicon glyphicon-trash' aria-hidden='true'></span> Delete";
  deleteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (params.saving.state == true) alert("Please wait for processing to complete");
    else confirmDelete(params);
  });
  area.appendChild(deleteBtn);

  const editBtn = document.createElement('button');
  editBtn.type = "button";
  editBtn.id = "editBtn";
  editBtn.className = "btn btn-default bottom-space pull-right";
  editBtn.innerHTML = "<span class='glyphicon glyphicon-edit' aria-hidden='true'></span> Edit";
  editBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (params.saving.state == true) alert("Please wait for processing to complete");
    else createEditGroup(params);
  });
  area.appendChild(editBtn);
};

const confirmDelete = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = "";
  const header = document.createElement('h1');
  header.innerHTML = "Confirm Delete of wallet: "+params.group.name;
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));

  const deleteBtn = document.createElement('button');
  deleteBtn.type = "button";
  deleteBtn.id = "deleteBtn";
  deleteBtn.className = "btn btn-default bottom-space pull-right";
  deleteBtn.innerHTML = "<span class='glyphicon glyphicon-trash' aria-hidden='true'></span> Confirm";
  deleteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    deleteBtn.disabled = true;
    params.vaultData.groups.splice(params.vaultData.groupSelected,1);
    params.vaultData.groupSelected = null;
    params.vaultData.recordSelected = null;
    params.saving.state = true;
    statusMgr.loadStatus();
    ipc.send('process-group', {cryptoKey:params.cryptoKey,type:"group-delete",vaultData:params.vaultData});
    area.innerHTML = "";
  });
  area.appendChild(deleteBtn);
};
