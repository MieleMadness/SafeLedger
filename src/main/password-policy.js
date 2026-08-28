'use strict';

const MAX_MASTER_PASSWORD_LENGTH = 128;

function validatePassword(value) {
  const password = String(value || '');
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > MAX_MASTER_PASSWORD_LENGTH) return `Password must be ${MAX_MASTER_PASSWORD_LENGTH} characters or fewer`;
  if (!/[a-z]/.test(password)) return 'Password must contain at least 1 lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least 1 number';
  return '';
}

function scorePassword(value) {
  const password = String(value || '');
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 15) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (/(.)\1{2,}/.test(password)) score--;
  if (/password|qwerty|123456|letmein|admin/i.test(password)) score -= 2;
  return Math.max(0, Math.min(5, score));
}

module.exports = { MAX_MASTER_PASSWORD_LENGTH, validatePassword, scorePassword };
