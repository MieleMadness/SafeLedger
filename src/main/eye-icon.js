'use strict';

function markup(revealed = false) {
  const slash = revealed
    ? '<path class="sl-eye-slash" d="M4 2.5 20 13.5" />'
    : '';
  return `<svg class="sl-eye-svg${revealed ? ' is-revealed' : ''}" viewBox="0 0 24 16" aria-hidden="true" focusable="false">
    <path class="sl-eye-outline" d="M1.25 8S5.2 1.5 12 1.5 22.75 8 22.75 8 18.8 14.5 12 14.5 1.25 8 1.25 8Z" />
    <circle class="sl-eye-pupil" cx="12" cy="8" r="3.5" />
    ${slash}
  </svg>`;
}

module.exports = { markup };
