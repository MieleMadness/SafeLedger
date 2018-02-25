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
  if (params.vaultData.groupSelected != null && params.vaultData.groups[params.vaultData.groupSelected].records != null
    && params.vaultData.groups[params.vaultData.groupSelected].records.length > 0 ) {
    const records = params.vaultData.groups[params.vaultData.groupSelected].records;
    for (let i = 0; i < records.length; i++) {
      const recordName = records[i].name.toLowerCase();
      if (recordSearch != null && recordSearch.value.length > 0 &&
        !(recordName.startsWith(recordSearch.value.toLowerCase())) ){
        continue;
      }
        const li = document.createElement("LI");
  				li.setAttribute("data-toggle","collapse");
  				li.setAttribute("data-target","#"+records[i].name);
  				ul.appendChild(li);
  				const href = document.createElement("A");
          href.addEventListener('click', _ => {
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
  form.addEventListener('submit', (e) => {
    e.preventDefault();
  });
  area.appendChild(form);
  const formgroup = document.createElement('div');
  formgroup.className = "form-group";
  form.appendChild(formgroup);
  // name
  const labelName = document.createElement('label');
  labelName.for = "inputName";
  labelName.innerHTML = "Name";
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
  //Address
  const labelAddress = document.createElement('label');
  labelAddress.for = "inputAddress";
  labelAddress.innerHTML = "Address";
  formgroup.appendChild(labelAddress);
  const inputAddress = document.createElement('input');
  inputAddress.type = "text";
  inputAddress.className = "form-control";
  inputAddress.id = "inputAddress";
  inputAddress.setAttribute('maxlength','500');
  if (params.record != null && params.record.address != null) {
    inputAddress.value = params.record.address;
  }
  formgroup.appendChild(inputAddress);
  //password
  const labelPassword = document.createElement('label');
  labelPassword.for = "inputPassword";
  labelPassword.innerHTML = "Password";
  formgroup.appendChild(labelPassword);
  const inputPassword = document.createElement('input');
  inputPassword.type = "text";
  inputPassword.className = "form-control";
  inputPassword.id = "inputPassword";
  inputPassword.setAttribute('maxlength','500');
  if (params.record != null && params.record.password != null) {
    inputPassword.value = params.record.password;
  }
  formgroup.appendChild(inputPassword);
  //Private key
  const labelPrivateKey = document.createElement('label');
  labelPrivateKey.for = "inputPrivateKey";
  labelPrivateKey.innerHTML = "Private Key";
  formgroup.appendChild(labelPrivateKey);
  const inputPrivateKey = document.createElement('input');
  inputPrivateKey.type = "text";
  inputPrivateKey.className = "form-control";
  inputPrivateKey.id = "inputPrivateKey";
  inputPrivateKey.setAttribute('maxlength','500');
  if (params.record != null && params.record.privatekey != null) {
    inputPrivateKey.value = params.record.privatekey;
  }
  formgroup.appendChild(inputPrivateKey);
  // Pin
  const labelPin = document.createElement('label');
  labelPin.for = "inputPin";
  labelPin.innerHTML = "Pin";
  formgroup.appendChild(labelPin);
  const inputPin = document.createElement('input');
  inputPin.type = "text";
  inputPin.className = "form-control";
  inputPin.id = "inputPin";
  inputPin.setAttribute('maxlength','500');
  if (params.record != null && params.record.pin != null) {
    inputPin.value = params.record.pin;
  }
  formgroup.appendChild(inputPin);
  //Backup phrase
  const labelBackupPhrase = document.createElement('label');
  labelBackupPhrase.for = "inputBackupPhrase";
  labelBackupPhrase.innerHTML = "Backup Phrase";
  formgroup.appendChild(labelBackupPhrase);
  const inputBackupPhrase = document.createElement('input');
  inputBackupPhrase.type = "text";
  inputBackupPhrase.className = "form-control";
  inputBackupPhrase.id = "inputBackupPhrase";
  inputBackupPhrase.setAttribute('maxlength','500');
  if (params.record != null && params.record.backupphrase != null) {
    inputBackupPhrase.value = params.record.backupphrase;
  }
  formgroup.appendChild(inputBackupPhrase);
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
      const symbol = inputSymbol.value;
      if (name != null && name.value != "") {
        if (params.record != null) {
          // Modify
          params.saving.state = true;
          statusMgr.loadStatus();
          params.record.name = name.value;
          params.record.symbol = inputSymbol.value;
          params.record.address = inputAddress.value;
          params.record.password = inputPassword.value;
          params.record.privatekey = inputPrivateKey.value;
          params.record.pin = inputPin.value;
          params.record.backupphrase = inputBackupPhrase.value;
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
          myRecord.address = inputAddress.value;
          myRecord.password = inputPassword.value;
          myRecord.privatekey = inputPrivateKey.value;
          myRecord.pin = inputPin.value;
          myRecord.backupphrase = inputBackupPhrase.value;
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
  area.appendChild(saveBtn);
};

exports.showRecordDetail = (params) => {
  renderRecordDetail(params);
};

const renderRecordDetail = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = "";
  const header = document.createElement('h1');
  header.innerHTML = "Coin: "+params.record.name;
  area.appendChild(header);
  const divider = document.createElement('hr');
  area.appendChild(divider);

  const symbol = document.createElement('p');
  if (params.record.symbol != null) {
    symbol.innerHTML = "<b>Symbol:</b> "+params.record.symbol;
  } else {
    symbol.innerHTML = "<b>Symbol:</b> ";
  }
  area.appendChild(symbol);
  const address = document.createElement('p');
  if (params.record.address != null) {
    address.innerHTML = "<b>Address:</b> "+params.record.address;
  } else {
    address.innerHTML = "<b>Address:</b> ";
  }
  area.appendChild(address)
  const password= document.createElement('p');
  if (params.record.password != null) {
    password.innerHTML = "<b>Password:</b> "+params.record.password;
  } else {
    password.innerHTML = "<b>Password:</b> ";
  }
  area.appendChild(password);
  const privateKey = document.createElement('p');
  if (params.record.privatekey != null) {
    privateKey.innerHTML = "<b>Private Key:</b> "+params.record.privatekey;
  } else {
    privateKey.innerHTML = "<b>Private Key:</b> ";
  }
  area.appendChild(privateKey);
  const pin = document.createElement('p');
  if (params.record.pin != null) {
    pin.innerHTML = "<b>Pin:</b> "+params.record.pin;
  } else {
    pin.innerHTML = "<b>Pin:</b> ";
  }
  area.appendChild(pin);
  const backupPhrase = document.createElement('p');
  if (params.record.backupphrase != null) {
    backupPhrase.innerHTML = "<b>Backup Phrase:</b> "+params.record.backupphrase;
  } else {
    backupPhrase.innerHTML = "<b>Backup Phrase:</b> ";
  }
  area.appendChild(backupPhrase);
  const notes = document.createElement('p');
  notes.innerHTML = "<b>Notes:</b>";
  area.appendChild(notes);
  const notesDetail = document.createElement('p');
  if (params.record.notes != null) {
    const r = params.record.notes.replace(/(?:\r\n|\r|\n)/g, '<br />');
    notesDetail.innerHTML = r;
  } else {
    notesDetail.innerHTML = "";
  }
  area.appendChild(notesDetail);
  const created = document.createElement('p');
  created.innerHTML = "<b>Created:</b> "+params.record.created;
  area.appendChild(created);
  const modified = document.createElement('p');
  if (params.record.modified != null) {
    modified.innerHTML = "<b>Modified:</b> "+params.record.modified;
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
  deleteBtn.addEventListener('click', _ => {
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
