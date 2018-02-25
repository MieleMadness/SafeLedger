/*
  Author: Edward Seufert - Cborgtech, LLC
*/

const electron = require('electron');
const {ipcRenderer : ipc } = electron;
const statusMgr = require('./status');

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
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (params.saving.state == true) {
      alert("Please wait for processing to complete");
    } else {
      saveBtn.disabled = true;
      const name = document.getElementById('inputName');
      if (name != null && name.value != "") {
        if (params.group != null) {
          params.group.name = name.value;
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
  area.appendChild(form);
  const formgroup = document.createElement('div');
  formgroup.className = "form-group";
  form.appendChild(formgroup);
  const label = document.createElement('label');
  label.for = "inputName";
  label.innerHTML = "Name";
  formgroup.appendChild(label);
  const input = document.createElement('input');
  input.type = "text";
  input.className = "form-control";
  input.id = "inputName";
  input.setAttribute('maxlength','25');
  if (params.group != null) {
    input.value = params.group.name;
  }
  formgroup.appendChild(input);

  const saveBtn = document.createElement('button');
  saveBtn.type = "button";
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
  area.appendChild(saveBtn);
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
