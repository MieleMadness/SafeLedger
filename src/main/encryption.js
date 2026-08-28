'use strict';

const crypto = require('crypto');
const runtimeUtils = require('./runtime-utils');

const MAX_MASTER_PASSWORD_LENGTH = runtimeUtils.MAX_MASTER_PASSWORD_LENGTH;
const AUTHENTICATED_PREFIX = 'SLG2';
const AUTHENTICATED_IV_BYTES = 12;
const AUTHENTICATED_TAG_BYTES = 16;
const AUTHENTICATED_AAD = Buffer.from('SafeLedger authenticated vault format SLG2', 'utf8');

exports.showEncrptionDetail = () => {
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.innerHTML = 'Encryption Settings';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));
  const created = document.createElement('p');
  created.innerHTML = 'Change Password';
  area.appendChild(created);

  const form = document.createElement('form');
  area.appendChild(form);
  const formgroup = document.createElement('div');
  formgroup.className = 'form-group';
  form.appendChild(formgroup);

  const labelOldPassword = document.createElement('label');
  labelOldPassword.htmlFor = 'inputOldPassword';
  labelOldPassword.innerHTML = 'Old Password';
  formgroup.appendChild(labelOldPassword);
  const inputOldPassword = document.createElement('input');
  inputOldPassword.type = 'password';
  inputOldPassword.className = 'form-control';
  inputOldPassword.id = 'inputOldPassword';
  inputOldPassword.setAttribute('maxlength', String(MAX_MASTER_PASSWORD_LENGTH));
  formgroup.appendChild(inputOldPassword);

  const labelNewPassword = document.createElement('label');
  labelNewPassword.htmlFor = 'inputNewPassword';
  labelNewPassword.innerHTML = 'New Password';
  formgroup.appendChild(labelNewPassword);
  const inputNewPassword = document.createElement('input');
  inputNewPassword.type = 'password';
  inputNewPassword.className = 'form-control';
  inputNewPassword.id = 'inputNewPassword';
  inputNewPassword.setAttribute('maxlength', String(MAX_MASTER_PASSWORD_LENGTH));
  formgroup.appendChild(inputNewPassword);

  const editBtn = document.createElement('button');
  editBtn.type = 'submit';
  editBtn.id = 'encryptionEditBtn';
  editBtn.className = 'btn btn-default bottom-space pull-right';
  editBtn.innerHTML = "<span class='glyphicon glyphicon-save' aria-hidden='true'></span> Save";
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

exports.encrypt = (cryptoKey, clearData) => {
  const randomIV = crypto.randomBytes(AUTHENTICATED_IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', cryptoKey, randomIV, { authTagLength: AUTHENTICATED_TAG_BYTES });
  cipher.setAAD(AUTHENTICATED_AAD);
  const encryptedData = Buffer.concat([cipher.update(String(clearData), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [AUTHENTICATED_PREFIX, randomIV.toString('hex'), authTag.toString('hex'), encryptedData.toString('hex')].join(':');
};

exports.decrypt = (cryptoKey, encryptedValue) => {
  if (!isAuthenticatedEncryptedPayload(encryptedValue)) {
    throw new Error('Unsupported or damaged SafeLedger encrypted payload');
  }
  const parts = encryptedValue.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', cryptoKey, Buffer.from(parts[1], 'hex'), {
    authTagLength: AUTHENTICATED_TAG_BYTES
  });
  decipher.setAAD(AUTHENTICATED_AAD);
  decipher.setAuthTag(Buffer.from(parts[2], 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(parts[3], 'hex')),
    decipher.final()
  ]).toString('utf8');
};

exports.isAuthenticatedEncryptedPayload = isAuthenticatedEncryptedPayload;
exports.encryptedPayloadLooksValid = isAuthenticatedEncryptedPayload;
exports.AUTHENTICATED_PREFIX = AUTHENTICATED_PREFIX;
