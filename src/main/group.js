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

exports.listGroups = (params) => {
  renderGroups(params);
};

const renderGroups = (params) => {
  const groupSearch = document.getElementById('groupSearch');
  // list of groups
  const groupArea = document.getElementById('groupArea');
  groupArea.innerHTML = "";
  const ul = document.createElement("UL");
  ul.className = "nav";
  if (params.vaultData.groups != null) {
    const groupsArray = params.vaultData.groups;
    for (let i = 0; i < groupsArray.length; i++) {
      const groupName = groupsArray[i].name.toLowerCase();
      if (groupSearch != null && groupSearch.value.length > 0 &&
        !(groupName.startsWith(groupSearch.value.toLowerCase())) ){
        continue;
      }
        const li = document.createElement("LI");
  				li.setAttribute("data-toggle","collapse");
  				li.setAttribute("data-target","#"+groupsArray[i].name);
  				ul.appendChild(li);
  				const href = document.createElement("A");
          href.addEventListener('click', _ => {
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
          let nameString = "";
          if (params.vaultData.groupSelected != null && params.vaultData.groupSelected == i) {
            href.className = "item-selected";
          }
          nameString = nameString + "<span class='glyphicon glyphicon-piggy-bank' aria-hidden='true'></span> "+groupsArray[i].name;
  				href.innerHTML = nameString;
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

const createEditGroup = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = "";
  const header = document.createElement('h1');
  if (params.group != null) {
    header.innerHTML = "Modify Wallet";
  } else {
    header.innerHTML = "Add Wallet";
  }
  area.appendChild(header);
  const divider = document.createElement('hr');
  area.appendChild(divider);
  const form = document.createElement('form');
  area.appendChild(form);

  const formGroupName = document.createElement('div');
  formGroupName.className = "form-group";
  form.appendChild(formGroupName);
  // name
  const label = document.createElement('label');
  label.for = "inputName";
  label.innerHTML = "Name";
  formGroupName.appendChild(label);
  const inputName = document.createElement('input');
  inputName.type = "text";
  inputName.className = "form-control";
  inputName.id = "inputName";
  inputName.setAttribute('maxlength','25');
  if (params.group != null) {
    inputName.value = params.group.name;
  }
  formGroupName.appendChild(inputName);
  //password
  const formGroupPassword = document.createElement('div');
  formGroupPassword.className = "form-group";
  form.appendChild(formGroupPassword);

  const labelPassword = document.createElement('label');
  labelPassword.for = "inputPassword";
  labelPassword.innerHTML = "Password";
  formGroupPassword.appendChild(labelPassword);
  const inputPassword = document.createElement('input');
  inputPassword.type = "text";
  inputPassword.className = "form-control";
  inputPassword.id = "inputPassword";
  inputPassword.setAttribute('maxlength','500');
  if (params.group != null && params.group.password != null) {
    inputPassword.value = params.group.password;
  }
  formGroupPassword.appendChild(inputPassword);
  //Backup phrase
  const formGroupPhrase = document.createElement('div');
  formGroupPhrase.className = "form-group";
  form.appendChild(formGroupPhrase);

  const labelBackupPhrase = document.createElement('label');
  labelBackupPhrase.for = "inputBackupPhrase";
  labelBackupPhrase.innerHTML = "Backup Phrase";
  formGroupPhrase.appendChild(labelBackupPhrase);
  const inputBackupPhrase = document.createElement('input');
  inputBackupPhrase.type = "text";
  inputBackupPhrase.className = "form-control";
  inputBackupPhrase.id = "inputBackupPhrase";
  inputBackupPhrase.setAttribute('maxlength','500');
  if (params.group != null && params.group.backupphrase != null) {
    inputBackupPhrase.value = params.group.backupphrase;
  }
  formGroupPhrase.appendChild(inputBackupPhrase);
  //Backup link
  const formGroupLink = document.createElement('div');
  formGroupLink.className = "form-group";
  form.appendChild(formGroupLink);

  const labelBackupLink = document.createElement('label');
  labelBackupLink.for = "inputBackupLink";
  labelBackupLink.innerHTML = "Backup Link";
  formGroupLink.appendChild(labelBackupLink);
  const inputBackupLink = document.createElement('input');
  inputBackupLink.type = "text";
  inputBackupLink.className = "form-control";
  inputBackupLink.id = "inputBackupLink";
  inputBackupLink.setAttribute('maxlength','500');
  if (params.group != null && params.group.backuplink != null) {
    inputBackupLink.value = params.group.backuplink;
  }
  formGroupLink.appendChild(inputBackupLink);
  // notes
  const formGroupNotes = document.createElement('div');
  formGroupNotes.className = "form-group";
  form.appendChild(formGroupNotes);

  const labelNotes = document.createElement('label');
  labelNotes.for = "inputNotes";
  labelNotes.innerHTML = "Notes";
  formGroupNotes.appendChild(labelNotes);
  const inputNotes = document.createElement('textarea');
  inputNotes.rows = "5";
  inputNotes.className = "form-control";
  inputNotes.id = "inputNotes";
  inputNotes.setAttribute('maxlength','500');
  if (params.group != null && params.group.notes != null) {
    inputNotes.value = params.group.notes;
  }
  formGroupNotes.appendChild(inputNotes);

  const saveBtn = document.createElement('button');
  saveBtn.type = "submit";
  saveBtn.id = "saveBtn";
  saveBtn.className = "btn btn-default bottom-space pull-right";
  saveBtn.innerHTML = "<span class='glyphicon glyphicon-save' aria-hidden='true'></span> Save";
  saveBtn.addEventListener('click', _ => {
    if (params.saving.state == true) {
      alert("Please wait for processing to complete");
    } else {
      saveBtn.disabled = true;
      const name = document.getElementById('inputName');
      if (name != null && name.value != "") {
        if (params.group != null) {
          params.group.name = name.value;
          params.group.password = inputPassword.value;
          params.group.backupphrase = inputBackupPhrase.value;
          params.group.backuplink = inputBackupLink.value;
          params.group.notes = inputNotes.value;
          params.group.modified = Date();
          params.vaultData.groups[params.vaultData.groupSelected] = params.group;
          params.vaultData.groups.sort(utils.compareIgnoreCase);
          params.vaultData.groupSelected = params.vaultData.groups.indexOf(params.group);
          params.saving.state = true;
          statusMgr.loadStatus();
          ipc.send('process-group', {cryptoKey:params.cryptoKey,type:"group-modify",vaultData:params.vaultData});
        } else {
          let myGroup = {};
          myGroup.name = name.value;
          myGroup.password = inputPassword.value;
          myGroup.backupphrase = inputBackupPhrase.value;
          myGroup.backuplink = inputBackupLink.value;
          myGroup.notes = inputNotes.value;
          myGroup.created = Date();
          params.vaultData.groups.push(myGroup);
          params.vaultData.groups.sort(utils.compareIgnoreCase);
          params.vaultData.groupSelected = params.vaultData.groups.indexOf(myGroup);
          params.saving.state = true;
          statusMgr.loadStatus();
          ipc.send('process-group', {cryptoKey:params.cryptoKey,type:"group-create",vaultData:params.vaultData});
        }
      } else {
        saveBtn.disabled = false;
      }
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
  header.innerHTML = "Wallet: "+params.group.name;
  area.appendChild(header);
  const divider = document.createElement('hr');
  area.appendChild(divider);
  // password
  const password= document.createElement('p');
  if (params.group.password != null) {
    password.innerHTML = "<b>Password:</b> "+params.group.password;
  } else {
    password.innerHTML = "<b>Password:</b> ";
  }
  area.appendChild(password);
  // backupPhrase
  const backupPhrase = document.createElement('p');
  if (params.group.backupphrase != null) {
    backupPhrase.innerHTML = "<b>Backup Phrase:</b> "+params.group.backupphrase;
  } else {
    backupPhrase.innerHTML = "<b>Backup Phrase:</b> ";
  }
  area.appendChild(backupPhrase);
  // backupLink
  const backupLink = document.createElement('p');
  if (params.group.backuplink != null) {
    backupLink.innerHTML = "<b>Backup Link:</b> "+params.group.backuplink;
  } else {
    backupLink.innerHTML = "<b>Backup Link:</b> ";
  }
  area.appendChild(backupLink);
  // notes
  const notes = document.createElement('p');
  notes.innerHTML = "<b>Notes:</b>";
  area.appendChild(notes);
  const notesDetail = document.createElement('p');
  if (params.group.notes != null) {
    const r = params.group.notes.replace(/(?:\r\n|\r|\n)/g, '<br />');
    notesDetail.innerHTML = r;
  } else {
    notesDetail.innerHTML = "";
  }
  area.appendChild(notesDetail);
  // created
  const created = document.createElement('p');
  created.innerHTML = "<b>Created:</b> "+params.group.created;
  area.appendChild(created);
  const modified = document.createElement('p');
  if (params.group.modified != null) {
    modified.innerHTML = "<b>Modified:</b> "+params.group.modified;
  }
  area.appendChild(modified);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = "button";
  deleteBtn.id = "deleteBtn";
  deleteBtn.className = "btn btn-default bottom-space pull-right";
  deleteBtn.innerHTML = "<span class='glyphicon glyphicon-trash' aria-hidden='true'></span> Delete";
  deleteBtn.addEventListener('click', _ => {
    if (params.saving.state == true) {
      alert("Please wait for processing to complete");
    } else {
      confirmDelete(params);
    }
  });
  area.appendChild(deleteBtn);
  const editBtn = document.createElement('button');
  editBtn.type = "button";
  editBtn.id = "editBtn";
  editBtn.className = "btn btn-default bottom-space pull-right";
  editBtn.innerHTML = "<span class='glyphicon glyphicon-edit' aria-hidden='true'></span> Edit";
  editBtn.addEventListener('click', _ => {
    if (params.saving.state == true) {
      alert("Please wait for processing to complete");
    } else {
      createEditGroup(params);
    }
  });
  area.appendChild(editBtn);
};

const confirmDelete = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = "";
  const header = document.createElement('h1');
  header.innerHTML = "Confirm Delete of wallet: "+params.group.name;
  area.appendChild(header);
  const divider = document.createElement('hr');
  area.appendChild(divider);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = "button";
  deleteBtn.id = "deleteBtn";
  deleteBtn.className = "btn btn-default bottom-space pull-right";
  deleteBtn.innerHTML = "<span class='glyphicon glyphicon-trash' aria-hidden='true'></span> Confirm";
  deleteBtn.addEventListener('click', _ => {
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
