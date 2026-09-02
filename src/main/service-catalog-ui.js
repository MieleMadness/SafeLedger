'use strict';

const serviceCatalog = require('./service-catalog');
const SERVICE_CATEGORY = 'Web3 / Website Account';

function addKnownPresetOptions() {
  const category = document.querySelector('#detailArea #inputCategory');
  const select = document.querySelector('#detailArea #inputVaultItemPreset');
  if (!category || !select || category.value !== SERVICE_CATEGORY) return;
  const existing = new Set([...select.options].map((option) => String(option.value || '').trim().toLowerCase()));
  for (const service of serviceCatalog.SERVICES) {
    if (existing.has(service.name.toLowerCase())) continue;
    const option = document.createElement('option');
    option.value = service.name;
    option.textContent = service.name;
    select.appendChild(option);
  }
}

function patchKnownServiceIcons() {
  for (const anchor of document.querySelectorAll('#groupArea .nav > li > a')) {
    const category = anchor.querySelector('.wallet-list-category');
    const nameNode = anchor.querySelector('.wallet-list-name');
    if (!category || !nameNode || !/website|service/i.test(category.textContent || '')) continue;
    const service = serviceCatalog.find(nameNode.textContent);
    if (!service) continue;
    const existing = anchor.querySelector('.vault-service-icon, .wallet-list-icon, .wallet-list-catalog-icon, .wallet-list-brand-image, .wallet-list-fallback-icon');
    if (existing && existing.dataset && existing.dataset.serviceCatalog === service.name) continue;
    const icon = serviceCatalog.createIcon(service.name, 'wallet-list-brand-image vault-service-icon known-service-brand-image');
    if (!icon) continue;
    icon.dataset.serviceCatalog = service.name;
    if (existing) existing.replaceWith(icon);
    else anchor.insertBefore(icon, anchor.firstChild);
  }
}

function patch() {
  addKnownPresetOptions();
  patchKnownServiceIcons();
}

function start() {
  patch();
  const observer = new MutationObserver(() => queueMicrotask(patch));
  observer.observe(document.body, { childList: true, subtree: true });
}

if (typeof window !== 'undefined') window.addEventListener('DOMContentLoaded', start);

exports._test = { addKnownPresetOptions, patchKnownServiceIcons };
