'use strict';

const passwordPolicy = require('./password-policy');
const eyeIcon = require('./eye-icon');

function moveLoginButtonAfterPassword(shell) {
  const loginButton = document.getElementById('loginBtn');
  if (!loginButton || !shell || !shell.parentNode) return null;
  let controls = document.getElementById('loginSecurityControls');
  if (!controls) {
    controls = document.createElement('div');
    controls.id = 'loginSecurityControls';
    controls.className = 'login-security-controls';
    shell.parentNode.insertBefore(controls, shell.nextSibling);
  }
  loginButton.classList.remove('pull-right');
  loginButton.classList.add('login-submit-button');
  controls.appendChild(loginButton);
  return controls;
}

function makeVisibilityControl(input, showText = 'Show password') {
  if (!input || input.dataset.safeledgerVisibility === '1') return null;
  input.dataset.safeledgerVisibility = '1';

  const parent = input.parentNode;
  const shell = document.createElement('div');
  shell.className = `secure-input-shell password-visibility-shell${input.id === 'masterCryptoInput' ? ' login-password-shell' : ''}`;
  parent.insertBefore(shell, input);
  shell.appendChild(input);

  const show = document.createElement('button');
  show.type = 'button';
  show.className = 'btn btn-default btn-sm field-inline-action password-visibility-toggle';
  show.title = showText;
  show.setAttribute('aria-label', showText);
  show.innerHTML = eyeIcon.markup(false);
  show.addEventListener('click', () => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    const title = hidden ? 'Hide password' : showText;
    show.title = title;
    show.setAttribute('aria-label', title);
    show.innerHTML = eyeIcon.markup(hidden);
  });
  shell.appendChild(show);

  const loginControls = input.id === 'masterCryptoInput' ? moveLoginButtonAfterPassword(shell) : null;
  return { shell, button: show, loginControls };
}

function addStrengthMeter(input, anchor) {
  if (!input || input.dataset.safeledgerStrength === '1') return null;
  input.dataset.safeledgerStrength = '1';
  const meter = document.createElement('div');
  meter.className = `password-strength${input.id === 'masterCryptoInput' ? ' login-password-strength' : ''}`;
  const bar = document.createElement('div');
  bar.className = 'password-strength-bar';
  const label = document.createElement('span');
  label.className = 'password-strength-label';
  meter.appendChild(bar);
  meter.appendChild(label);

  const insertionAnchor = anchor || input.parentNode;
  if (insertionAnchor && insertionAnchor.parentNode) insertionAnchor.parentNode.insertBefore(meter, insertionAnchor.nextSibling);
  else if (input.parentNode) input.parentNode.insertBefore(meter, input.nextSibling);

  const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const update = () => {
    const score = passwordPolicy.scorePassword(input.value);
    bar.style.width = `${score * 20}%`;
    label.textContent = `${labels[score]}${input.value.length < 15 ? ' — 15+ characters recommended' : ''}`;
    meter.dataset.score = String(score);
  };
  input.addEventListener('input', update);
  update();
  return meter;
}

function configure(input, options = {}) {
  if (!input) return null;
  input.type = 'password';
  input.maxLength = passwordPolicy.MAX_MASTER_PASSWORD_LENGTH;
  input.setAttribute('autocomplete', options.autocomplete || 'off');
  const visibility = makeVisibilityControl(input, options.showText || 'Show password');
  const strengthAnchor = visibility && visibility.loginControls ? visibility.loginControls : visibility && visibility.shell;
  const meter = options.strength ? addStrengthMeter(input, strengthAnchor) : null;
  return { visibility, meter };
}

module.exports = { configure, makeVisibilityControl, addStrengthMeter, moveLoginButtonAfterPassword };
