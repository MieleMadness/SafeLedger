'use strict';

const DURATIONS = Object.freeze({ fast: 140, normal: 200, dashboard: 320, nav: 190 });

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
  reveal,
  dashboardEntrance,
  animateReadiness
};
