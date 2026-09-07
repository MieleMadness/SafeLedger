'use strict';

const DURATIONS = Object.freeze({ fast: 140, normal: 200, dashboard: 320, nav: 190 });
let pendingSave = null;

function prefersReducedMotion() {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {
    return false;
  }
}

function animate(node, keyframes, options = {}) {
  if (!node || prefersReducedMotion() || typeof node.animate !== 'function') return Promise.resolve(false);
  try {
    const animation = node.animate(keyframes, Object.assign({ duration: DURATIONS.normal, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' }, options));
    return animation.finished.then(() => true).catch(() => false);
  } catch (_) {
    return Promise.resolve(false);
  }
}

function rememberSave(button) {
  if (!button || typeof button.getBoundingClientRect !== 'function') {
    pendingSave = null;
    return;
  }
  const rect = button.getBoundingClientRect();
  pendingSave = {
    button,
    rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  };
}

function clearSave() {
  pendingSave = null;
}

function signalSaveSuccess() {
  const pending = pendingSave;
  pendingSave = null;
  if (!pending || typeof document === 'undefined') return false;

  const connected = pending.button && pending.button.isConnected;
  if (connected) {
    const icon = pending.button.querySelector('.fa');
    if (icon) icon.className = 'fa fa-check';
    pending.button.classList.add('detail-save-success');
  }

  if (prefersReducedMotion()) return true;
  const pop = document.createElement('span');
  pop.className = 'save-success-pop';
  pop.setAttribute('aria-hidden', 'true');
  pop.innerHTML = '<i class="fa fa-check"></i>';
  const rect = pending.rect;
  pop.style.left = `${Math.round(rect.left + rect.width / 2)}px`;
  pop.style.top = `${Math.round(rect.top + rect.height / 2)}px`;
  document.body.appendChild(pop);
  animate(pop, [
    { opacity: 0, transform: 'translate(-50%, -50%) scale(.72)' },
    { opacity: 1, transform: 'translate(-50%, -50%) scale(1.06)', offset: .45 },
    { opacity: 0, transform: 'translate(-50%, -58%) scale(1)' }
  ], { duration: 360 }).finally(() => pop.remove());
  return true;
}

function reveal(node) {
  if (!node) return Promise.resolve(false);
  return animate(node, [
    { opacity: 0, transform: 'translateY(-4px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ], { duration: DURATIONS.fast });
}

function dashboardEntrance(area) {
  if (!area || prefersReducedMotion()) return;
  const nodes = Array.from(area.querySelectorAll('.dashboard-section, .dashboard-header')).slice(0, 12);
  nodes.forEach((node, index) => {
    animate(node, [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: DURATIONS.dashboard, delay: index * 34 });
  });
}

function animateReadiness(circle, targetPercent) {
  if (!circle) return;
  const circumference = Number(circle.dataset.circumference) || 0;
  const percent = Math.max(0, Math.min(100, Number(targetPercent) || 0));
  const target = circumference ? circumference * (1 - percent / 100) : 0;
  if (!circumference || prefersReducedMotion()) {
    circle.style.strokeDashoffset = String(target);
    return;
  }
  const start = circumference;
  circle.style.strokeDashoffset = String(start);
  animate(circle, [
    { strokeDashoffset: start },
    { strokeDashoffset: target }
  ], { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' }).then(() => {
    circle.style.strokeDashoffset = String(target);
  });
}

module.exports = {
  DURATIONS,
  prefersReducedMotion,
  animate,
  rememberSave,
  clearSave,
  signalSaveSuccess,
  reveal,
  dashboardEntrance,
  animateReadiness,
  _test: { getPendingSave: () => pendingSave }
};