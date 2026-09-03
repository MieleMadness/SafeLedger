'use strict';

const FIXED_FIELDS = Object.freeze([
  Object.freeze({ label: 'Network', type: 'text' }),
  Object.freeze({ label: 'Contract address', type: 'text' })
]);

function rowLabel(row) {
  const input = row && row.querySelector('.custom-field-label-control input');
  return String(input && input.value || '').trim().toLowerCase();
}

function setTextIfChanged(node, text) {
  if (!node || node.textContent === text) return false;
  node.textContent = text;
  return true;
}

function markFixedRow(row, field) {
  if (!row || row.dataset.assetIdentityField === field.label) return false;
  row.dataset.assetIdentityField = field.label;
  row.classList.add('asset-identity-field');
  const labelInput = row.querySelector('.custom-field-label-control input');
  const typeSelect = row.querySelector('.custom-field-type-control select');
  const valueCaption = row.querySelector('.custom-field-value-control > label');
  const remove = row.querySelector('.custom-field-remove');
  if (labelInput) { labelInput.value = field.label; labelInput.readOnly = true; }
  if (typeSelect) {
    if (typeSelect.value !== field.type) {
      typeSelect.value = field.type;
      typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    typeSelect.tabIndex = -1;
  }
  if (valueCaption) setTextIfChanged(valueCaption, field.label);
  if (remove && remove.style.display !== 'none') remove.style.display = 'none';
  const labelWrap = row.querySelector('.custom-field-label-control');
  const typeWrap = row.querySelector('.custom-field-type-control');
  if (labelWrap && labelWrap.style.display !== 'none') labelWrap.style.display = 'none';
  if (typeWrap && typeWrap.style.display !== 'none') typeWrap.style.display = 'none';
  return true;
}

function ensureField(editor, field) {
  let row = [...editor.querySelectorAll('.custom-field-edit-row')].find((candidate) => rowLabel(candidate) === field.label.toLowerCase());
  if (!row) {
    const add = editor.querySelector('.custom-field-add');
    if (!add || typeof add.click !== 'function') return false;
    add.click();
    const rows = editor.querySelectorAll('.custom-field-edit-row');
    row = rows[rows.length - 1];
  }
  return markFixedRow(row, field);
}

function patchAssetEditor(doc = document) {
  const area = doc && doc.getElementById ? doc.getElementById('detailArea') : null;
  const heading = area && area.querySelector('h1');
  if (!heading || !/^(Add|Modify) Asset$/i.test(String(heading.textContent || '').trim())) return false;
  const editor = area.querySelector('.custom-fields-editor');
  if (!editor) return false;

  let changed = false;
  for (const field of FIXED_FIELDS) changed = ensureField(editor, field) || changed;
  const title = editor.querySelector('.product-section-title');
  changed = setTextIfChanged(title, 'Network & Additional Fields') || changed;
  const note = editor.querySelector('.custom-fields-note');
  changed = setTextIfChanged(
    note,
    'Network and Contract address are standard SafeLedger asset identity fields. Add other optional fields below as needed.'
  ) || changed;
  return changed;
}

function start(doc = document) {
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      // Do not observe SafeLedger's own Asset-form patch. The original 2.6.2
      // implementation observed its own text/field mutations and could create
      // an endless Add Asset render loop.
      observer.disconnect();
      patchAssetEditor(doc);
      observer.observe(doc.body, { childList: true, subtree: true });
    });
  });

  patchAssetEditor(doc);
  observer.observe(doc.body, { childList: true, subtree: true });
  return observer;
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', () => start(document));

exports.FIXED_FIELDS = FIXED_FIELDS;
exports._test = { rowLabel, setTextIfChanged, markFixedRow, ensureField, patchAssetEditor, start };
