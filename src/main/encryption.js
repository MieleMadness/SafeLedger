/*
  Author: Edward Seufert - Cborgtech, LLC
*/

const electron = require('electron')
const {ipcRenderer : ipc } = electron;
const crypto = require('crypto');
const statusMgr = require('./status');

exports.showEncrptionDetail = (params) => {
  renderEncryptionDetail(params);
};

const renderEncryptionDetail = (params) => {
  const area = document.getElementById('detailArea');
  area.innerHTML = "";
  const header = document.createElement('h1');
  header.innerHTML = "Encryption Settings";
  area.appendChild(header);
  const divider = document.createElement('hr');
  area.appendChild(divider);
  const created = document.createElement('p');
  created.innerHTML = "Change Password";
  area.appendChild(created);

  const form = document.createElement('form');
  area.appendChild(form);

  const formgroup = document.createElement('div');
  formgroup.className = "form-group";
  form.appendChild(formgroup);
  // old password
  const labelOldPassword = document.createElement('label');
  labelOldPassword.for = "inputOldPassword";
  labelOldPassword.innerHTML = "Old Password";
  formgroup.appendChild(labelOldPassword);
  const inputOldPassword = document.createElement('input');
  inputOldPassword.type = "text";
  inputOldPassword.className = "form-control";
  inputOldPassword.id = "inputOldPassword";
  inputOldPassword.setAttribute('maxlength','60');
  formgroup.appendChild(inputOldPassword);

  // new password
  const labelNewPassword = document.createElement('label');
  labelNewPassword.for = "inputNewPassword";
  labelNewPassword.innerHTML = "New Password";
  formgroup.appendChild(labelNewPassword);
  const inputNewPassword = document.createElement('input');
  inputNewPassword.type = "text";
  inputNewPassword.className = "form-control";
  inputNewPassword.id = "inputNewPassword";
  inputNewPassword.setAttribute('maxlength','60');
  formgroup.appendChild(inputNewPassword);

  const editBtn = document.createElement('button');
  editBtn.type = "submit";
  editBtn.id = "encryptionEditBtn";
  editBtn.className = "btn btn-default bottom-space pull-right";
  editBtn.innerHTML = "<span class='glyphicon glyphicon-save' aria-hidden='true'></span> Save";
  editBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (params.saving.state == true) {
      alert("Please wait for processing to complete");
    } else {
      editBtn.disabled = true;
      let statusCode = true;
      let statusMsg = "";
      let rx = new RegExp(/[a-z]/);
      if (!(rx.test(inputNewPassword.value))) { statusCode = false; statusMsg='Password must contain at least 1 alpha character' };
      rx = new RegExp(/[0-9]/);
      if (!(rx.test(inputNewPassword.value))) { statusCode = false; statusMsg='Password must contain at least 1 number' };
      rx = new RegExp(/[A-Z]/);
      if (!(rx.test(inputNewPassword.value))) { statusCode = false; statusMsg='Password must contain at least 1 Uppercase letter' };
      if (inputOldPassword.value == inputNewPassword.value) { statusCode = false; statusMsg='Old password can not match new password' };
      if (!(inputNewPassword.value.length >= 8)) { statusCode = false; statusMsg='Password must be at least 8 character' };
      if (statusCode == false){
        editBtn.disabled = false;
        statusMgr.showStatus({status:'ERROR',statusMsg});
      } else {
        params.saving.state = true;
        statusMgr.loadStatus();
        const oldCrypto = crypto.createHmac('sha256',inputOldPassword.value.split("").reverse().join("")).update(inputOldPassword.value).digest();
        const newCrypto= crypto.createHmac('sha256',inputNewPassword.value.split("").reverse().join("")).update(inputNewPassword.value).digest();
        inputOldPassword.value = "********************";
        inputNewPassword.value = "********************";
        ipc.send('process-rotate-crypto', {oldCryptoKey:oldCrypto,newCryptoKey:newCrypto,vaultList:params.vaultList});
      }
    }
  });
  form.appendChild(editBtn);
};

exports.encrypt = (cryptoKey, clearData) => {
  const randomIV = crypto.randomBytes(16);
  //console.log("random string " + randomIV);
  //console.log("crytokey " + cryptoKey);
  let encipher = crypto.createCipheriv('aes-256-cbc', cryptoKey, randomIV);
  let encryptedData = encipher.update(clearData,'utf8');
  //encryptData += encipher.final("base64");
  const finalBuffer = Buffer.concat([encryptedData, encipher.final()]);
  const encryptedHex = randomIV.toString('hex') + ':' + finalBuffer.toString('hex');
  //console.log("encrypt data "  + encryptedHex);
  return encryptedHex;
}

exports.decrypt = (cryptoKey, encryptedHex) => {
  //console.log("decrypt " + encryptedHex);
  //console.log("crytokey " + cryptoKey);
  const encryptedArray = encryptedHex.split(':');
  const randomIV = new Buffer(encryptedArray[0], 'hex');
  //console.log("random iv " + randomIV);
  const encryptedData = new Buffer(encryptedArray[1], 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', cryptoKey, randomIV);
  let decrypted = decipher.update(encryptedData,'utf8');
  const clearText = Buffer.concat([decrypted, decipher.final()]).toString();
  //console.log("clear text " + clearText);
  return clearText;
}
