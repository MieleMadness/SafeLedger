/*
  Author: Edward Seufert - Cborgtech, LLC
*/

const electron = require('electron');
const {ipcRenderer : ipc } = electron;
const crypto = require('crypto');
const statusMgr = require('./status');
const runtimeUtils = require('./runtime-utils');

const MAX_MASTER_PASSWORD_LENGTH = runtimeUtils.MAX_MASTER_PASSWORD_LENGTH;
const AUTHENTICATED_PREFIX = 'SLG2';
const AUTHENTICATED_IV_BYTES = 12;
const AUTHENTICATED_TAG_BYTES = 16;
const AUTHENTICATED_AAD = Buffer.from('SafeLedger authenticated vault format SLG2', 'utf8');

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

  const labelOldPassword = document.createElement('label');
  labelOldPassword.for = "inputOldPassword";
  labelOldPassword.innerHTML = "Old Password";
  formgroup.appendChild(labelOldPassword);
  const inputOldPassword = document.createElement('input');
  inputOldPassword.type = "password";
  inputOldPassword.className = "form-control";
  inputOldPassword.id = "inputOldPassword";
  inputOldPassword.setAttribute('maxlength', String(MAX_MASTER_PASSWORD_LENGTH));
  formgroup.appendChild(inputOldPassword);

  const labelNewPassword = document.createElement('label');
  labelNewPassword.for = "inputNewPassword";
  labelNewPassword.innerHTML = "New Password";
  formgroup.appendChild(labelNewPassword);
  const inputNewPassword = document.createElement('input');
  inputNewPassword.type = "password";
  inputNewPassword.className = "form-control";
  inputNewPassword.id = "inputNewPassword";
  inputNewPassword.setAttribute('maxlength', String(MAX_MASTER_PASSWORD_LENGTH));
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
      if (inputNewPassword.value.length > MAX_MASTER_PASSWORD_LENGTH) { statusCode = false; statusMsg=`Password must be ${MAX_MASTER_PASSWORD_LENGTH} characters or fewer` };
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

function isHex(value, exactLength) {
  if (typeof value !== 'string') return false;
  if (exactLength != null && value.length !== exactLength) return false;
  return value.length % 2 === 0 && /^[0-9a-fA-F]*$/.test(value);
}

function isAuthenticatedEncryptedPayload(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split(':');
  if (parts.length !== 4 || parts[0] !== AUTHENTICATED_PREFIX) return false;
  return isHex(parts[1], AUTHENTICATED_IV_BYTES * 2)
    && isHex(parts[2], AUTHENTICATED_TAG_BYTES * 2)
    && isHex(parts[3]);
}

function isLegacyEncryptedPayload(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split(':');
  if (parts.length !== 2) return false;
  const iv = parts[0];
  const payload = parts[1];
  return isHex(iv, 32)
    && payload.length > 0
    && payload.length % 32 === 0
    && isHex(payload);
}

exports.encrypt = (cryptoKey, clearData) => {
  const randomIV = crypto.randomBytes(AUTHENTICATED_IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', cryptoKey, randomIV, {
    authTagLength: AUTHENTICATED_TAG_BYTES
  });
  cipher.setAAD(AUTHENTICATED_AAD);
  const encryptedData = Buffer.concat([
    cipher.update(String(clearData), 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();
  return [
    AUTHENTICATED_PREFIX,
    randomIV.toString('hex'),
    authTag.toString('hex'),
    encryptedData.toString('hex')
  ].join(':');
};

exports.decrypt = (cryptoKey, encryptedValue) => {
  if (isAuthenticatedEncryptedPayload(encryptedValue)) {
    const parts = encryptedValue.split(':');
    const randomIV = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encryptedData = Buffer.from(parts[3], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', cryptoKey, randomIV, {
      authTagLength: AUTHENTICATED_TAG_BYTES
    });
    decipher.setAAD(AUTHENTICATED_AAD);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]).toString('utf8');
  }

  if (isLegacyEncryptedPayload(encryptedValue)) {
    const encryptedArray = encryptedValue.split(':');
    const randomIV = Buffer.from(encryptedArray[0], 'hex');
    const encryptedData = Buffer.from(encryptedArray[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', cryptoKey, randomIV);
    return Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]).toString('utf8');
  }

  throw new Error('Unsupported or damaged SafeLedger encrypted payload');
};

exports.isAuthenticatedEncryptedPayload = isAuthenticatedEncryptedPayload;
exports.isLegacyEncryptedPayload = isLegacyEncryptedPayload;
exports.encryptedPayloadLooksValid = (value) =>
  isAuthenticatedEncryptedPayload(value) || isLegacyEncryptedPayload(value);
exports.AUTHENTICATED_PREFIX = AUTHENTICATED_PREFIX;
