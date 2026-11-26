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

// LinkedIn's sharebox stays mounted but hidden; its "Start a post" button opens the composer.
async function openComposer(media: boolean) {
  const start = document.getElementById('draft-text-replaceable-component')?.closest<HTMLElement>('[role="button"]');
  if (!start) return;
  if (config().inlineComposer) {
    document.getElementById('lt-compose')?.scrollIntoView({ block: 'nearest' });
    dockRequestedAt = Date.now();
  }
  start.click();
  if (!media) return;
  // The composer's own Media button takes images and video; the sharebox's Photo and Video
  // buttons each accept only one kind.
  try {
    const dialog = await until(() => document.querySelector(`dialog[open]:has(${COMPOSE})`));
    (await until(() => dialog.querySelector('svg#image-outline-medium')?.closest('button'))).click();
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

export function placeCompose(): void {
  const sharebox = document.querySelector('[data-testid="mainFeed"] > :has(#draft-text-replaceable-component)');
  if (!sharebox) {
    document.getElementById('lt-compose')?.remove();
    return;
  }
  const el = document.getElementById('lt-compose') ?? renderCompose();
  if (sharebox.previousElementSibling !== el) sharebox.before(el);
  // LinkedIn may unmount the composer without closing it (no `close` event).
  if (el.hasAttribute('data-docked') && !document.querySelector('dialog[data-lt-docked][open]')) {
    el.removeAttribute('data-docked');
    el.style.removeProperty('min-height');
  }
}
