'use strict';

const detailActions = require('./detail-actions');
const passwordControls = require('./password-controls');
const passwordPolicy = require('./password-policy');

function addPasswordField(parent, id, labelText, autocomplete, strength = false) {
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = labelText;
  parent.appendChild(label);
  const input = document.createElement('input');
  input.type = 'password';
  input.className = 'form-control';
  input.id = id;
  parent.appendChild(input);
  passwordControls.configure(input, { autocomplete, strength });
  return input;
}

function show() {
  detailActions.clear();
  const area = document.getElementById('detailArea');
  area.innerHTML = '';
  const header = document.createElement('h1');
  header.textContent = 'Encryption Settings';
  area.appendChild(header);
  area.appendChild(document.createElement('hr'));
  const intro = document.createElement('p');
  intro.textContent = 'Change Password';
  area.appendChild(intro);
  const form = document.createElement('form');
  form.addEventListener('submit', (event) => event.preventDefault());
  area.appendChild(form);
  const formGroup = document.createElement('div');
  formGroup.className = 'form-group';
  form.appendChild(formGroup);
  addPasswordField(formGroup, 'inputOldPassword', 'Old Password', 'current-password');
  addPasswordField(formGroup, 'inputNewPassword', 'New Password', 'new-password', true);
  addPasswordField(formGroup, 'inputConfirmNewPassword', 'Confirm New Password', 'new-password');
  const note = document.createElement('p');
  note.className = 'settings-section-note';
  note.textContent = `Passwords can be up to ${passwordPolicy.MAX_MASTER_PASSWORD_LENGTH} characters. Changing the password re-wraps the existing data key; vault files are not decrypted and re-encrypted.`;
  form.appendChild(note);
  const editBtn = document.createElement('button');
  editBtn.type = 'submit';
  editBtn.id = 'encryptionEditBtn';
  editBtn.className = 'btn btn-default bottom-space pull-right';
  editBtn.innerHTML = "<span class='glyphicon glyphicon-save' aria-hidden='true'></span> Save";
  form.appendChild(editBtn);
}

module.exports = { show };
