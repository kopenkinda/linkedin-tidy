import { config } from './config';

// Promoted posts look like any other post. The "Promoted" or "Promoted by X" line under the
// author is the tell. They also lack the "Hide post" ×, but so do your own posts.
const PROMOTED = /^Promoted(\s+by\s.+)?$/;

export function markAds(): void {
  document.documentElement.toggleAttribute('data-lt-hide-ads', config().hideAds);
  const items = document.querySelectorAll('[data-testid="mainFeed"] [role="listitem"]:not([data-lt-ad])');
  for (const item of items) {
    // The list item mounts before its post; check once the header is in.
    if (!item.querySelector('button[aria-label^="Open control menu"]')) continue;
    const ad = [...item.querySelectorAll('p')].some((p) => PROMOTED.test(p.textContent?.trim() ?? ''));
    item.setAttribute('data-lt-ad', String(ad));
  }
}
