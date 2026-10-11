'use strict';

// Test-only Electron renderer geometry inspection. This is called by the
// GUI smoke harness; it must never change the user's actual workspace state.
async function verifyProfileIconGeometry(webContents) {
        const layout = await webContents.executeJavaScript(`(() => {
          const html = document.documentElement;
          const savedAppearance = html.getAttribute('data-appearance');
          const savedTheme = html.getAttribute('data-theme');
          const fixture = document.createElement('div');
          fixture.className = 'profile-icon-picker';
          fixture.style.cssText = 'position:fixed;top:12px;left:12px;width:360px;visibility:hidden;z-index:-1';
          const search = document.createElement('div');
          search.className = 'profile-icon-picker-search';
          search.style.height = '32px';
          const results = document.createElement('div');
          results.className = 'profile-icon-picker-results';
          const grid = document.createElement('div');
          grid.className = 'profile-icon-picker-grid';
          const option = document.createElement('button');
          option.className = 'profile-icon-option';
          const frame = document.createElement('span');
          frame.className = 'profile-icon-option-frame';
          const logo = document.createElement('img');
          logo.className = 'known-service-brand-image';
          frame.appendChild(logo);
          option.appendChild(frame);
          // The real icon tile has a trailing label span. Without it the
          // existing :last-child label rule stretches the frame to 100%.
          const label = document.createElement('span');
          label.textContent = 'GitHub';
          option.appendChild(label);
          grid.appendChild(option);
          results.appendChild(grid);
          fixture.appendChild(search);
          fixture.appendChild(results);
          document.body.appendChild(fixture);
          const checks = [];
          try {
            for (const appearance of ['light', 'colorful', 'dark']) {
              html.setAttribute('data-appearance', appearance);
              html.setAttribute('data-theme', appearance === 'dark' ? 'dark' : 'light');
              const gap = grid.getBoundingClientRect().top - search.getBoundingClientRect().bottom;
              const bounds = frame.getBoundingClientRect();
              const background = getComputedStyle(logo).backgroundColor;
              const gridDisplay = getComputedStyle(grid).display;
              if (gap < 9.5 || gap > 11.5) throw Error(appearance + ': icon results gap is ' + gap + 'px (expected 10px)');
              if (Math.abs(bounds.width - 40) > 0.5 || Math.abs(bounds.height - 40) > 0.5) {
                throw Error(appearance + ': icon frame dimensions are ' + bounds.width + 'x' + bounds.height);
              }
              if (gridDisplay !== 'grid') throw Error(appearance + ': Profile icon grid does not use CSS grid');
              if (background !== 'rgb(255, 255, 255)') throw Error(appearance + ': brand mark neutral backing missing');
              checks.push(appearance);
            }
            return { ok: true, checks };
          } catch (error) {
            return { ok: false, message: String(error && error.message || error) };
          } finally {
            fixture.remove();
            if (savedAppearance == null) html.removeAttribute('data-appearance');
            else html.setAttribute('data-appearance', savedAppearance);
            if (savedTheme == null) html.removeAttribute('data-theme');
            else html.setAttribute('data-theme', savedTheme);
          }
        })()`, true);
        if (!layout || layout.ok !== true) throw new Error('Profile layout: ' + (layout && layout.message || 'unknown render error'));
        if (layout.checks.join(',') !== 'light,colorful,dark') throw new Error('Profile layout contract did not cover all appearances');

  return layout;
}

module.exports = { verifyProfileIconGeometry };
