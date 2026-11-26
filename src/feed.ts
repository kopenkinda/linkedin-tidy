import { config, mutedWords } from './config';

// Tags feed posts for styles.css: promoted posts (data-lt-ad) and posts that mention a
// muted word (data-lt-muted, holding the word). We match the page, not the network: the
// post's full text is already in the DOM, even behind "… more", while the feed's network
// responses are LinkedIn's streaming server-render format, which we'd have to parse and
// then map back to the page anyway.

const POSTS = ':is([data-testid="mainFeed"], [data-testid="NetworkFeedListCollection"]) [role="listitem"]';

// Promoted posts look like any other post. The "Promoted" or "Promoted by X" line under the
// author is the tell. They also lack the "Hide post" ×, but so do your own posts.
const PROMOTED = /^Promoted(\s+by\s.+)?$/;

let rules = { key: '', find: (_text: string): string | undefined => undefined };

/** Rebuilds the matcher when the word list changes; returns whether it did. */
function updateRules(words: string[]) {
  const key = words.join('\n');
  if (key === rules.key) return false;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // Whole words or phrases, any case: "AI" shouldn't match "said".
  const re = words.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join('|')})(?![\\p{L}\\p{N}])`, 'iu') : undefined;
  rules = { key, find: (text) => re?.exec(text)?.[1] };
  return true;
}

// textContent glues neighbouring elements together ("crypto" + "Follow"), which breaks
// word boundaries; join the text nodes with spaces instead.
function textOf(el: Element) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue ?? '');
  return parts.join(' ');
}

export function markPosts(): void {
  const { hideAds, collapseFiltered } = config();
  document.documentElement.toggleAttribute('data-lt-hide-ads', hideAds);
  document.documentElement.toggleAttribute('data-lt-collapse-filtered', collapseFiltered);
  // Each post is checked once, and all of them again when the word list changes.
  const recheck = updateRules(mutedWords());
  for (const item of document.querySelectorAll(recheck ? POSTS : `${POSTS}:not([data-lt-ad])`)) {
    // The list item mounts before its post; check once the header is in. The post itself
    // excludes the comments below it, so a muted word in a comment doesn't count.
    const post = item.querySelector('div:has(> h2)');
    if (!post?.querySelector('button[aria-label^="Open control menu"]')) continue;
    item.setAttribute('data-lt-ad', String([...post.querySelectorAll('p')].some((p) => PROMOTED.test(p.textContent?.trim() ?? ''))));
    const word = rules.find(textOf(post));
    if (word) item.setAttribute('data-lt-muted', word);
    else item.removeAttribute('data-lt-muted');
  }
}

/** A click on a collapsed muted post shows it. */
export function installMutedReveal(): void {
  document.addEventListener('click', (e) => {
    const item = (e.target as Element).closest?.('[data-lt-muted]:not([data-lt-revealed])');
    if (!item || !document.documentElement.hasAttribute('data-lt-collapse-filtered')) return;
    e.preventDefault();
    e.stopPropagation();
    item.setAttribute('data-lt-revealed', '');
  }, true);
}
