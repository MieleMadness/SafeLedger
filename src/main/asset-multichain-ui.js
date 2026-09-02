'use strict';

const FIXED_FIELDS = Object.freeze([
  Object.freeze({ label: 'Network', type: 'text' }),
  Object.freeze({ label: 'Contract address', type: 'text' })
]);

function rowLabel(row) {
  const input = row && row.querySelector('.custom-field-label-control input');
  return String(input && input.value || '').trim().toLowerCase();
}

function markFixedRow(row, field) {
  if (!row || row.dataset.assetIdentityField === field.label) return;
  row.dataset.assetIdentityField = field.label;
  row.classList.add('asset-identity-field');
  const labelInput = row.querySelector('.custom-field-label-control input');
  const typeSelect = row.querySelector('.custom-field-type-control select');
  const valueCaption = row.querySelector('.custom-field-value-control > label');
  const remove = row.querySelector('.custom-field-remove');
  if (labelInput) { labelInput.value = field.label; labelInput.readOnly = true; }
  if (typeSelect) { typeSelect.value = field.type; typeSelect.dispatchEvent(new Event('change', { bubbles: true })); typeSelect.tabIndex = -1; }
  if (valueCaption) valueCaption.textContent = field.label;
  if (remove) remove.style.display = 'none';
  const labelWrap = row.querySelector('.custom-field-label-control');
  const typeWrap = row.querySelector('.custom-field-type-control');
  if (labelWrap) labelWrap.style.display = 'none';
  if (typeWrap) typeWrap.style.display = 'none';
}

function ensureField(editor, field) {
  let row = [...editor.querySelectorAll('.custom-field-edit-row')].find((candidate) => rowLabel(candidate) === field.label.toLowerCase());
  if (!row) {
    const add = editor.querySelector('.custom-field-add');
    if (!add) return;
    add.click();
    const rows = editor.querySelectorAll('.custom-field-edit-row');
    row = rows[rows.length - 1];
  }
  markFixedRow(row, field);
}

function patchAssetEditor() {
  const area = document.getElementById('detailArea');
  const heading = area && area.querySelector('h1');
  if (!heading || !/^(Add|Modify) Asset$/i.test(String(heading.textContent || '').trim())) return;
  const editor = area.querySelector('.custom-fields-editor');
  if (!editor) return;
  for (const field of FIXED_FIELDS) ensureField(editor, field);
  const title = editor.querySelector('.product-section-title');
  if (title) title.textContent = 'Network & Additional Fields';
  const note = editor.querySelector('.custom-fields-note');
  if (note) note.textContent = 'Network and Contract address are standard SafeLedger asset identity fields. Add other optional fields below as needed.';
}

function start() {
  patchAssetEditor();
  const observer = new MutationObserver(() => queueMicrotask(patchAssetEditor));
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports.FIXED_FIELDS = FIXED_FIELDS;
exports._test = { rowLabel, markFixedRow, ensureField, patchAssetEditor };
