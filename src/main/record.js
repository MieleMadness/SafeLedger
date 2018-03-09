/*
  Author: Edward Seufert - Cborgtech, LLC
*/

const electron = require('electron');
const {ipcRenderer : ipc } = electron;
const statusMgr = require('./status');

const utils = require('./utils');

exports.listRecords = (params) => {
  renderRecords(params);
};

const renderRecords = (params) => {
  const recordSearch = document.getElementById('recordSearch');
  // list of records
  const recordArea = document.getElementById('recordArea');
  recordArea.innerHTML = "";
  const ul = document.createElement("UL");
  ul.className = "nav";
  if (params.vaultData != null && params.vaultData.groupSelected != null && params.vaultData.groups[params.vaultData.groupSelected].records != null
    && params.vaultData.groups[params.vaultData.groupSelected].records.length > 0 ) {
    const records = params.vaultData.groups[params.vaultData.groupSelected].records;
    for (let i = 0; i < records.length; i++) {
      const recordName = records[i].name.toLowerCase();
      const recordSymbol = records[i].symbol.toLowerCase();
      if (recordSearch != null && recordSearch.value.length > 0 &&
        !((recordName.startsWith(recordSearch.value.toLowerCase())) || (recordSymbol.startsWith(recordSearch.value.toLowerCase()))) ){
        continue;
      }
        const li = document.createElement("LI");
  				li.setAttribute("data-toggle","collapse");
  				li.setAttribute("data-target","#"+records[i].name);
  				ul.appendChild(li);
  				const href = document.createElement("A");
          href.addEventListener('click', (e) => {
            e.preventDefault();
            if (params.saving.state == true) {
              alert("Please wait for processing to complete");
            } else {
              params.vaultData.recordSelected = i;
              renderRecordDetail({cryptoKey:params.cryptoKey,vaultData:params.vaultData,record:records[i],saving:params.saving});
              renderRecords(params);
            }
          });
          let nameString = "";
          if (params.vaultData.recordSelected != null && params.vaultData.recordSelected == i) {
            href.className = "item-selected";
          }
          let symbol = "";
          if (records[i].symbol != null && records[i].symbol != "") {
            symbol = "("+records[i].symbol+")";
          }
          nameString = nameString + "<i class='fa fa-cubes'></i> "+records[i].name+" "+symbol;
  				href.innerHTML = nameString;
          li.appendChild(href);
    }
    recordArea.appendChild(ul);
  } else {
    recordArea.innerHTML = "No items";
  }
};

exports.createRecord = (params) => {
  createEditRecord(params);
};

const createEditRecord = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = "";
  const header = document.createElement('h1');
  if (params.record != null) {
    header.innerHTML = "Modify Coin";
  } else {
    header.innerHTML = "Add Coin";
  }
  area.appendChild(header);
  const divider = document.createElement('hr');
  area.appendChild(divider);
  const form = document.createElement('form');
  area.appendChild(form);

  const formgroup = document.createElement('div');
  formgroup.className = "form-group";
  form.appendChild(formgroup);
  // name
  const labelName = document.createElement('label');
  labelName.for = "inputName";
  labelName.innerHTML = "Coin";
  formgroup.appendChild(labelName);
  const inputName = document.createElement('input');
  inputName.type = "text";
  inputName.className = "form-control";
  inputName.id = "inputName";
  inputName.setAttribute('maxlength','25');
  if (params.record != null) {
    inputName.value = params.record.name;
  }
  formgroup.appendChild(inputName);

  // symbol
  const labelSymbol = document.createElement('label');
  labelSymbol.for = "inputSymbol";
  labelSymbol.innerHTML = "Symbol";
  formgroup.appendChild(labelSymbol);
  const inputSymbol = document.createElement('input');
  inputSymbol.type = "text";
  inputSymbol.className = "form-control";
  inputSymbol.id = "inputSymbol";
  inputSymbol.setAttribute('maxlength','500');
  if (params.record != null && params.record.symbol != null) {
    inputSymbol.value = params.record.symbol;
  }
  formgroup.appendChild(inputSymbol);

  //Public Address
  const labelPublicAddress = document.createElement('label');
  labelPublicAddress.for = "inputPublicAddress";
  labelPublicAddress.innerHTML = "Public address";
  formgroup.appendChild(labelPublicAddress);
  const inputPublicAddress = document.createElement('input');
  inputPublicAddress.type = "text";
  inputPublicAddress.className = "form-control";
  inputPublicAddress.id = "inputPublicAddress";
  inputPublicAddress.setAttribute('maxlength','500');
  if (params.record != null && params.record.publicAddress != null) {
    inputPublicAddress.value = params.record.publicAddress;
  }
  formgroup.appendChild(inputPublicAddress);

  //Private address
  const labelPrivateAddress = document.createElement('label');
  labelPrivateAddress.for = "inputPrivateAddress";
  labelPrivateAddress.innerHTML = "Private address";
  formgroup.appendChild(labelPrivateAddress);
  const inputPrivateAddress = document.createElement('input');
  inputPrivateAddress.type = "text";
  inputPrivateAddress.className = "form-control";
  inputPrivateAddress.id = "inputPrivateAddress";
  inputPrivateAddress.setAttribute('maxlength','500');
  if (params.record != null && params.record.privateAddress != null) {
    inputPrivateAddress.value = params.record.privateAddress;
  }
  formgroup.appendChild(inputPrivateAddress);

  // notes
  const labelNotes = document.createElement('label');
  labelNotes.for = "inputNotes";
  labelNotes.innerHTML = "Notes";
  formgroup.appendChild(labelNotes);
  const inputNotes = document.createElement('textarea');
  inputNotes.rows = "5";
  inputNotes.className = "form-control";
  inputNotes.id = "inputNotes";
  inputNotes.setAttribute('maxlength','500');
  if (params.record != null && params.record.notes != null) {
    inputNotes.value = params.record.notes;
  }
  formgroup.appendChild(inputNotes);

  const saveBtn = document.createElement('button');
  saveBtn.type = "submit";
  saveBtn.id = "saveBtn";
  saveBtn.className = "btn btn-default bottom-space pull-right";
  saveBtn.innerHTML = "<span class='glyphicon glyphicon-save' aria-hidden='true'></span> Save";
  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (params.saving.state == true) {
      alert("Please wait for processing to complete");
    } else {
      saveBtn.disabled = true;
      const name = document.getElementById('inputName');
      const symbol = inputSymbol.value;
      if (name != null && name.value != "") {
        if (params.record != null) {
          // Modify
          params.saving.state = true;
          statusMgr.loadStatus();
          params.record.name = name.value;
          params.record.symbol = inputSymbol.value;
          params.record.publicAddress = inputPublicAddress.value;
          params.record.privateAddress = inputPrivateAddress.value;
          params.record.notes = inputNotes.value;
          params.record.modified = Date();
          params.vaultData.groups[params.vaultData.groupSelected].records[params.vaultData.recordSelected] = params.record;
          params.vaultData.groups[params.vaultData.groupSelected].records.sort(utils.compareIgnoreCase);
          params.vaultData.recordSelected = params.vaultData.groups[params.vaultData.groupSelected].records.indexOf(params.record);
          ipc.send('process-record', {cryptoKey:params.cryptoKey,action:"modify",vaultData:params.vaultData});
        } else {
          // Create
          params.saving.state = true;
          statusMgr.loadStatus();
          let myRecord = {};
          myRecord.name = name.value;
          myRecord.symbol = inputSymbol.value;
          myRecord.publicAddress = inputPublicAddress.value;
          myRecord.privateAddress = inputPrivateAddress.value;
          myRecord.notes = inputNotes.value;
          myRecord.created = Date();
          if (params.vaultData.groups[params.vaultData.groupSelected].records == null) {
            params.vaultData.groups[params.vaultData.groupSelected].records = new Array();
          }
          params.vaultData.groups[params.vaultData.groupSelected].records.push(myRecord);
          params.vaultData.groups[params.vaultData.groupSelected].records.sort(utils.compareIgnoreCase);
          params.vaultData.recordSelected = params.vaultData.groups[params.vaultData.groupSelected].records.indexOf(myRecord);
          ipc.send('process-record', {cryptoKey:params.cryptoKey,action:"create",vaultData:params.vaultData});
        }
      } else {
        saveBtn.disabled = false;
      }
    }
  });
  form.appendChild(saveBtn);
};

exports.showRecordDetail = (params) => {
  renderRecordDetail(params);
};

const renderRecordDetail = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = "";
  const header = document.createElement('h1');
  header.innerHTML = params.record.name;
  area.appendChild(header);
  const divider = document.createElement('hr');
  area.appendChild(divider);

  const symbol = document.createElement('p');
  if (params.record.symbol != null) {
    symbol.innerHTML = "<b>Symbol:</b> <div class='outData'>"+params.record.symbol+"</div>";
  } else {
    symbol.innerHTML = "<b>Symbol:</b> ";
  }
  area.appendChild(symbol);

  const publicAddress = document.createElement('p');
  if (params.record.publicAddress != null) {
    publicAddress.innerHTML = "<b>Public Address:</b> <div class='outData'>"+params.record.publicAddress+"</div>";
  } else {
    publicAddress.innerHTML = "<b>Public Address:</b> ";
  }
  area.appendChild(publicAddress)

  const privateAddress = document.createElement('p');
  if (params.record.privateAddress != null) {
    privateAddress.innerHTML = "<b>Private address:</b> <div class='outData'>"+params.record.privateAddress+"</div>";
  } else {
    privateAddress.innerHTML = "<b>Private address:</b> ";
  }
  area.appendChild(privateAddress);

  const notes = document.createElement('p');
  notes.innerHTML = "<b>Notes:</b>";
  area.appendChild(notes);
  const notesDetail = document.createElement('p');
  if (params.record.notes != null) {
    const r = params.record.notes.replace(/(?:\r\n|\r|\n)/g, '<br />');
    notesDetail.innerHTML = "<div class='outData'>"+r+"</div>";
  } else {
    notesDetail.innerHTML = "";
  }
  area.appendChild(notesDetail);

  const created = document.createElement('p');
  created.className = "dates";
  created.innerHTML = "<b>Created:</b> "+params.record.created;
  area.appendChild(created);
  const modified = document.createElement('p');
  modified.className = "dates";
  if (params.record.modified != null) {
    modified.innerHTML = "<b>Modified:</b> "+params.record.modified;
  }
  area.appendChild(modified);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = "button";
  deleteBtn.id = "deleteBtn";
  deleteBtn.className = "btn btn-default bottom-space pull-right";
  deleteBtn.innerHTML = "<span class='glyphicon glyphicon-trash' aria-hidden='true'></span> Delete";
  deleteBtn.addEventListener('click', (e) => {
    e.preventDefault();
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
  editBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (params.saving.state == true) {
      alert("Please wait for processing to complete");
    } else {
      createEditRecord(params);
    }
  });
  area.appendChild(editBtn);

};

const confirmDelete = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = "";
  const header = document.createElement('h1');
  header.innerHTML = "Confirm Delete of coin: "+params.record.name;
  area.appendChild(header);
  const divider = document.createElement('hr');
  area.appendChild(divider);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = "button";
  deleteBtn.id = "deleteBtn";
  deleteBtn.className = "btn btn-default bottom-space pull-right";
  deleteBtn.innerHTML = "<span class='glyphicon glyphicon-trash' aria-hidden='true'></span> Confirm";
  deleteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    deleteBtn.disabled = true;
    params.vaultData.groups[params.vaultData.groupSelected].records.splice(params.vaultData.recordSelected,1);
    params.vaultData.recordSelected = null;
    params.saving.state = true;
    statusMgr.loadStatus();
    ipc.send('process-record', {cryptoKey:params.cryptoKey,action:"delete",vaultData:params.vaultData});
    area.innerHTML = "";
  });
  area.appendChild(deleteBtn);
};
