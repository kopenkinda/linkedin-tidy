// LinkedIn Tidy. One bundle that runs as an MV3 content script or a Tampermonkey script.
//
// LinkedIn currently ships two frontends:
// - React (feed, profile, jobs, ...): hashed classes and hashed CSS variables. We hook into
//   named `componentkey`s, `data-testid`s, aria-labels and hrefs, never classes.
//   `data-view-name` looks useful but is behind a feature flag and often absent.
// - Ember (messaging page, floating chat): readable classes and named design tokens.
import { enhanceComposer, installComposerDock, placeCompose } from './composer';
import { addStyle, sync } from './dom';
import { addFooterToMoreMenu } from './nav';
import { installPickerGuard } from './picker';
import { readGames, readProfile, renderGames, renderProfile } from './rail';
import { followOsTheme, renderSettings, themePreference } from './settings';
import css from './styles.css';

declare global {
  interface Window {
    __linkedinTidy?: boolean;
  }
}

function update() {
  const identity = document.getElementById('feedIdentityModuleComponentRef');
  const me = identity && readProfile(identity);
  if (identity) {
    const profile = sync('lt-profile', me, renderProfile, identity);
    const games = sync('lt-games', readGames(), renderGames, profile ?? identity);
    sync('lt-settings', { theme: themePreference() }, (data) => renderSettings(data, update), games ?? profile ?? identity);
  }
  placeCompose();
  enhanceComposer();
  addFooterToMoreMenu();
}

if (!window.__linkedinTidy) {
  window.__linkedinTidy = true;

  addStyle('lt-style', css);
  installPickerGuard();
  installComposerDock();
  followOsTheme();
  // A dialog can close without any DOM change; `close` doesn't bubble, so listen in capture.
  document.addEventListener('close', () => update(), true);

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
}
