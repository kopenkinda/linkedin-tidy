import { config } from './config';
import { h, icon, until } from './dom';
import { ICONS } from './icons';

// Our box replaces LinkedIn's sharebox and opens LinkedIn's own composer, so every
// composer feature (identity, visibility, comments, media, events, polls, proofread,
// collaborators, schedule, drafts) keeps working.
//
// LinkedIn opens the composer with dialog.showModal(): a backdrop, and the page behind it
// goes inert and stops scrolling. When opened from our box with "Open the composer in the
// feed" on, we open that one dialog with show() instead and pin it onto our box, which
// grows to the composer's height. LinkedIn's own nested dialogs (media editor, schedule,
// "save as draft?") stay modal.

const COMPOSE = '[data-sdui-screen$="ShareCompose"]';

let dockRequestedAt = 0;

/** Must run in the page's JS world (userscript @grant none, extension world MAIN). */
export function installComposerDock(): void {
  const showModal = HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    // The composer's content can render after showModal, so match on timing: the first
    // LinkedIn dialog opened right after a click on our box is the composer.
    if (Date.now() - dockRequestedAt < 3000 && this.matches('[data-testid="dialog"]')) {
      dockRequestedAt = 0;
      dock(this);
      return this.show();
    }
    return showModal.call(this);
  };
  // Stop clicks on the locked Network tab (see placeCompose) before React sees them.
  for (const type of ['click', 'keydown'] as const) {
    window.addEventListener(type, (e) => {
      if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ') return;
      if (!(e.target as Element).closest?.('[data-lt-locked]')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);
  }
}

const boxSize = new ResizeObserver(([entry]) => {
  const box = document.getElementById('lt-compose');
  const height = entry?.borderBoxSize[0]?.blockSize;
  if (box && height) box.style.minHeight = `${height}px`;
});

function dock(dialog: HTMLDialogElement) {
  dialog.setAttribute('data-lt-docked', '');
  document.getElementById('lt-compose')?.setAttribute('data-docked', '');
  boxSize.observe(dialog);
  dialog.addEventListener('close', () => {
    dialog.removeAttribute('data-lt-docked');
    boxSize.unobserve(dialog);
    const box = document.getElementById('lt-compose');
    box?.removeAttribute('data-docked');
    box?.style.removeProperty('min-height');
  }, { once: true });
}

const TAB_BAR = '[componentkey="feed-tab-host_tab-bar"]';
const feedTabs = () => [...document.querySelectorAll<HTMLElement>(`${TAB_BAR} [role="button"]`)];
// LinkedIn's sharebox stays mounted but hidden; its "Start a post" button opens the composer.
const shareboxButton = () => document.getElementById('draft-text-replaceable-component')?.closest<HTMLElement>('[role="button"]');

// Set while a composer we opened from the Network tab is up; placeCompose() switches back
// once it's gone. Dismissing doesn't fire `close`: LinkedIn unmounts the dialog and goes
// back in history.
let returnToNetwork = false;

async function openComposer(media: boolean) {
  let start = shareboxButton();
  // LinkedIn only mounts the sharebox in the "For you" feed. From "Network", switch to For
  // you to open the composer.
  const fromNetwork = !start;
  if (!start) {
    const [forYou] = feedTabs();
    if (!forYou) return;
    forYou.click();
    try {
      start = await until(shareboxButton);
    } catch (error) {
      console.warn('[LinkedIn Plus]', error);
      return;
    }
  }
  if (config().inlineComposer) {
    document.getElementById('lt-compose')?.scrollIntoView({ block: 'nearest' });
    dockRequestedAt = Date.now();
  }
  start.click();
  try {
    const dialog = await until(() => document.querySelector<HTMLDialogElement>(`dialog[open]:has(${COMPOSE})`));
    returnToNetwork = fromNetwork;
    // The composer's own Media button takes images and video; the sharebox's Photo and
    // Video buttons each accept only one kind.
    if (media) (await until(() => dialog.querySelector('svg#image-outline-medium')?.closest('button'))).click();
  } catch (error) {
    console.warn('[LinkedIn Plus]', error);
  }
}

function renderCompose(): HTMLElement {
  const root = h('section', { id: 'lt-compose', class: 'lt-card', 'aria-label': 'Create a post' },
    h('button', { type: 'button', class: 'lt-compose-input', 'data-action': 'write' }, 'Write a post…'),
    h('div', { class: 'lt-compose-bar' },
      h('button', { type: 'button', 'data-action': 'media' }, icon(ICONS.image), 'Photo or video'),
      h('a', { href: 'https://www.linkedin.com/article/new/' }, icon(ICONS.article), 'Article')));
  root.addEventListener('click', (e) => {
    const action = (e.target as Element).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'write') void openComposer(false);
    if (action === 'media') void openComposer(true);
  });
  return root;
}

// Above the For you / Network tabs, so it stays when the feed below switches.
export function placeCompose(): void {
  const tabs = document.querySelector(TAB_BAR);
  if (!tabs) {
    document.getElementById('lt-compose')?.remove();
    return;
  }
  const el = document.getElementById('lt-compose') ?? renderCompose();
  if (tabs.previousElementSibling !== el) tabs.before(el);
  // LinkedIn may unmount the composer without closing it (no `close` event).
  if (el.hasAttribute('data-docked') && !document.querySelector('dialog[data-lt-docked][open]')) {
    el.removeAttribute('data-docked');
    el.style.removeProperty('min-height');
  }
  // The docked composer belongs to the For you feed: switching to Network unmounts it and
  // the post is gone. Lock that tab while writing.
  const network = feedTabs()[1];
  const writing = !!document.querySelector('dialog[data-lt-docked][open]');
  if (network && network.hasAttribute('data-lt-locked') !== writing) {
    network.toggleAttribute('data-lt-locked', writing);
    if (writing) network.setAttribute('aria-disabled', 'true');
    else network.removeAttribute('aria-disabled');
  }
  if (returnToNetwork && !document.querySelector(`dialog[open] ${COMPOSE}`)) {
    returnToNetwork = false;
    // The dialog unmounts before LinkedIn's history.back() lands; switching earlier gets
    // undone by that navigation.
    until(() => !location.pathname.startsWith('/sharing/')).then(() => feedTabs()[1]?.click(), () => {});
  }
}

// --- Composer layout and labels -----------------------------------------------------
//
// LinkedIn's composer markup has no stable classes, so we find its parts from a few
// stable markers (roles, icon ids, test ids) and tag them with data-lt-c; styles.css
// arranges the tagged parts: identity on top, the formatting toolbar, the editor, then a
// footer with the post's settings (visibility, comments, collaborators) next to Post.
// We only add attributes and rewrite label text in place, never move LinkedIn's nodes, so
// React keeps working. If a marker is missing, that part simply stays as LinkedIn drew it.

function tag(el: Element | null | undefined, part: string) {
  if (el && el.getAttribute('data-lt-c') !== part) el.setAttribute('data-lt-c', part);
}

function tagParts(screen: Element) {
  const identity = screen.querySelector('[role="button"][aria-label][aria-expanded]');
  const header = identity?.closest('div:has(figure)');
  tag(header?.firstElementChild, 'avatar');

  tag(screen.querySelector('[role="button"][aria-labelledby][aria-expanded]')?.parentElement, 'chips');

  // Editor column -> its grid -> the body column that also holds the toolbar and footer.
  const editorGrid = screen.querySelector('[data-testid="lazy-column"]')?.parentElement;
  const body = editorGrid?.parentElement;
  const bottom = editorGrid?.nextElementSibling;
  const rows = bottom?.firstElementChild;
  if (!body || !bottom || !rows) return;
  tag(body, 'body');
  tag(body.parentElement?.parentElement, 'main');
  // Flatten the bottom wrappers so the toolbar becomes a sibling of the editor and can
  // be ordered above it.
  tag(bottom, 'flatten');
  tag(rows, 'flatten');
  for (const row of rows.children) {
    if (row.querySelector('svg#emoji-outline-medium')) tagToolbar(row);
  }
  tag(rows.lastElementChild, 'footer');
}

// Toolbar: [Proofread] [tools: emoji, bold, [insert: media, celebration, ... + "more"]].
function tagToolbar(toolbar: Element) {
  tag(toolbar, 'toolbar');
  // Proofread and the tools share a wrapper a level or two down.
  let row = toolbar;
  while (row.children.length === 1 && row.firstElementChild) row = row.firstElementChild;
  tag(row, 'toolrow');
  for (const part of row.children) {
    if (part.querySelector('svg#premium-chip-fill-color-small')) tag(part, 'proofread');
    else if (part.querySelector('svg#emoji-outline-medium')) {
      tag(part, 'tools');
      for (const group of part.children) {
        if (!group.querySelector('svg#image-outline-medium')) continue;
        tag(group, 'insert');
        // Media gets its own divider: the rest are post types (event, job, poll, ...).
        let items = group.firstElementChild;
        while (items && items.children.length === 1) items = items.firstElementChild;
        tag(items, 'items');
        for (const item of items?.children ?? []) {
          if (item.querySelector('svg#image-outline-medium')) tag(item, 'media');
        }
        // The +/× toggle that shows Event, Job, Poll and Document inline.
        const toggle = group.lastElementChild;
        if (toggle?.querySelector('svg#plus-outline-medium, svg#xmark-outline-medium') && !toggle.querySelector('svg#image-outline-medium')) tag(toggle, 'more');
      }
    }
  }
}

// The "more" toggle only hides content types behind a click without saving space, so we
// expand it once and hide the toggle. Throttled in case LinkedIn re-renders it collapsed.
let lastExpand = 0;
function expandContentTypes(screen: Element) {
  const plus = screen.querySelector('[data-lt-c="more"] svg#plus-outline-medium')?.closest('button');
  if (plus && Date.now() - lastExpand > 1000) {
    lastExpand = Date.now();
    plus.click();
  }
}

const labelOf = (chip: Element) => document.getElementById(chip.getAttribute('aria-labelledby') ?? '')?.textContent?.trim() ?? '';

function visibilityLabel(screen: Element, label: string) {
  // LinkedIn's own label keeps saying "Post to Anyone" after picking a group; the group's
  // logo appearing next to your avatar is the reliable sign.
  if ((screen.querySelector('[data-lt-c="avatar"]')?.querySelectorAll('figure').length ?? 0) > 1) return 'Visibility: Group';
  const value = label.replace(/^Post to\s+/i, '');
  return `Visibility: ${value === 'Connections only' ? 'Connections' : value}`;
}

const COMMENTS: Record<string, string> = { Anyone: 'On', 'Connections only': 'Connections', Off: 'Off', 'No one': 'Off' };

function commentsLabel(label: string) {
  const value = label.replace(/^Comments:\s*/i, '');
  return `Comments: ${COMMENTS[value] ?? value}`;
}

function setLabel(chip: Element, text: string) {
  const node = chip.querySelector(':scope > div:last-child p span')?.firstChild;
  // Change the existing text node in place: React keeps its reference and simply
  // overwrites it on its next update, which our observer then maps again.
  if (node?.nodeType === Node.TEXT_NODE && node.nodeValue !== text) node.nodeValue = text;
}

function relabel(screen: Element) {
  const [visibility, comments] = screen.querySelectorAll('[role="button"][aria-labelledby][aria-expanded]');
  if (visibility) setLabel(visibility, visibilityLabel(screen, labelOf(visibility)));
  if (comments) setLabel(comments, commentsLabel(labelOf(comments)));
}

const watched = new WeakSet<Element>();

export function enhanceComposer(): void {
  const screen = document.querySelector(`dialog[open] ${COMPOSE}`);
  if (!screen) return;
  const apply = () => {
    tagParts(screen);
    expandContentTypes(screen);
    relabel(screen);
  };
  apply();
  if (watched.has(screen)) return;
  watched.add(screen);
  // Label changes are text-only (characterData), which the page-wide observer ignores.
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  }).observe(screen, { subtree: true, childList: true, characterData: true });
}
