'use strict';

const passwordPolicy = require('./password-policy');

function makeVisibilityControl(input, showText = 'Show Text') {
  if (!input || input.dataset.safeledgerVisibility === '1') return null;
  input.dataset.safeledgerVisibility = '1';
  const controls = document.createElement('div');
  controls.className = 'login-security-controls';
  const show = document.createElement('button');
  show.type = 'button';
  show.className = 'btn btn-default btn-sm';
  show.innerHTML = `<i class="fa fa-eye"></i> ${showText}`;
  show.addEventListener('click', () => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    show.innerHTML = hidden ? '<i class="fa fa-eye-slash"></i> Hide Text' : `<i class="fa fa-eye"></i> ${showText}`;
  });
  controls.appendChild(show);
  input.parentNode.insertBefore(controls, input.nextSibling);
  return controls;
}

function addStrengthMeter(input) {
  if (!input || input.dataset.safeledgerStrength === '1') return null;
  input.dataset.safeledgerStrength = '1';
  const meter = document.createElement('div');
  meter.className = 'password-strength';
  const bar = document.createElement('div');
  bar.className = 'password-strength-bar';
  const label = document.createElement('span');
  label.className = 'password-strength-label';
  meter.appendChild(bar);
  meter.appendChild(label);
  const controls = input.nextSibling;
  if (controls && controls.parentNode) controls.parentNode.insertBefore(meter, controls.nextSibling);
  else input.parentNode.insertBefore(meter, input.nextSibling);
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
  if (!input) return;
  input.type = 'password';
  input.maxLength = passwordPolicy.MAX_MASTER_PASSWORD_LENGTH;
  input.setAttribute('autocomplete', options.autocomplete || 'off');
  makeVisibilityControl(input, options.showText || 'Show Text');
  if (options.strength) addStrengthMeter(input);
}

module.exports = { configure, makeVisibilityControl, addStrengthMeter };
