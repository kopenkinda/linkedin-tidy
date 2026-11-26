import { config } from './config';
import { h, icon, signatures, until } from './dom';
import { ICONS } from './icons';

// Our box is the editor. Publishing still goes through LinkedIn's own composer: we open it
// from the hidden sharebox, pick the identity, type the text and press Post, all while it
// is invisible (html[data-lt-ghost]). If any step stalls, the composer is revealed with
// everything filled in, so nothing is lost.
const COMPOSE_DIALOG = 'dialog[open]:has([data-sdui-screen$="ShareCompose"])';

async function fillComposer(text: string, as: string | null): Promise<HTMLDialogElement> {
  const start = document.getElementById('draft-text-replaceable-component')?.closest<HTMLElement>('[role="button"]');
  if (!start) throw new Error('LinkedIn sharebox not found');
  start.click();
  const dialog = await until(() => document.querySelector<HTMLDialogElement>(COMPOSE_DIALOG));
  // The "post as" switcher is the only header button labelled with a name.
  const identity = () => dialog.querySelector<HTMLElement>('[role="button"][aria-label][aria-expanded]');
  if (as && (await until(identity)).getAttribute('aria-label') !== as) {
    // The switcher ignores clicks until LinkedIn has finished wiring up the composer, so
    // keep pressing it (gently) until its menu opens.
    let pressed = 0;
    const option = await until(() => {
      const radio = [...document.querySelectorAll<HTMLInputElement>('[popover] input[type="radio"]')]
        .find((r) => r.closest('[componentkey]')?.querySelector('p')?.textContent?.trim() === as);
      const button = identity();
      if (!radio && button && button.getAttribute('aria-expanded') !== 'true' && Date.now() - pressed > 500) {
        pressed = Date.now();
        button.click();
      }
      return radio;
    });
    option.click();
    await until(() => identity()?.getAttribute('aria-label') === as);
  }
  const editor = await until(() => dialog.querySelector<HTMLElement>('[componentkey="ShareBox_textEditor"][contenteditable="true"]'));
  editor.focus();
  // Replace whatever LinkedIn restored (a saved draft) with our text, line by line.
  document.execCommand('selectAll');
  document.execCommand('delete');
  text.split('\n').forEach((line, i) => {
    if (i) document.execCommand('insertParagraph');
    if (line) document.execCommand('insertText', false, line);
  });
  return dialog;
}

async function publish(text: string, as: string | null): Promise<boolean> {
  document.documentElement.setAttribute('data-lt-ghost', '');
  try {
    const dialog = await fillComposer(text, as);
    const post = await until(() => {
      const buttons = [...dialog.querySelectorAll('button')];
      const button = buttons.find((b) => b.textContent?.trim() === 'Post') ?? buttons.at(-1);
      return button && !button.disabled && button;
    });
    post.click();
    await until(() => !dialog.isConnected || !dialog.open, 20000);
    return true;
  } catch (error) {
    console.warn('[LinkedIn Plus]', error);
    return false;
  } finally {
    document.documentElement.removeAttribute('data-lt-ghost');
  }
}

function renderCompose({ identities }: { identities: string[] }): HTMLElement {
  const text = h('textarea', { rows: 1, placeholder: 'Write a post…', 'aria-label': 'Post text' });
  const select = h('select', { 'aria-label': 'Post as' }, identities.map((name) => h('option', { value: name }, name)));
  const post = h('button', { type: 'button', class: 'lt-compose-post', 'data-action': 'post', disabled: true }, 'Post');
  const status = h('p', { class: 'lt-compose-status', role: 'status' });
  const root = h('section', { id: 'lt-compose', class: 'lt-card', 'aria-label': 'Create a post' },
    text,
    h('div', { class: 'lt-compose-bar' },
      identities.length > 0 ? h('label', { class: 'lt-compose-as' }, 'Posting as', select) : h('span', { class: 'lt-compose-as' }),
      h('button', { type: 'button', 'data-action': 'media' }, icon(ICONS.image), 'Photo or video'),
      h('a', { href: 'https://www.linkedin.com/article/new/' }, icon(ICONS.article), 'Article'),
      post),
    status);
  const as = () => (identities.length ? select.value : null);

  const refresh = () => { post.disabled = !text.value.trim() || root.hasAttribute('data-busy'); };
  text.addEventListener('input', refresh);

  // Hand the draft to LinkedIn's visible composer (popup, media, or if in-feed posting is off).
  const openInLinkedIn = async (media: boolean) => {
    try {
      const dialog = await fillComposer(text.value, as());
      text.value = '';
      refresh();
      if (media) (await until(() => dialog.querySelector('svg#image-outline-medium')?.closest('button'))).click();
    } catch (error) {
      console.warn('[LinkedIn Plus]', error);
    }
  };

  const submit = async () => {
    if (post.disabled) return;
    root.setAttribute('data-busy', '');
    post.textContent = 'Posting…';
    status.textContent = '';
    refresh();
    const ok = await publish(text.value.trim(), as());
    root.removeAttribute('data-busy');
    post.textContent = 'Post';
    if (ok) text.value = '';
    else status.textContent = 'Couldn’t post in the background. Your post is open in LinkedIn’s composer.';
    refresh();
  };

  text.addEventListener('focus', () => {
    if (!config().inlineComposer) {
      text.blur();
      void openInLinkedIn(false);
    }
  });
  text.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit(); });
  root.addEventListener('click', (e) => {
    const action = (e.target as Element).closest<HTMLElement>('[data-action]')?.dataset.action;
    if (action === 'post') void submit();
    if (action === 'media') void openInLinkedIn(true);
  });
  return root;
}

/** `identities`: you and the pages you manage, the same list LinkedIn's switcher offers. */
export function placeCompose(identities: string[]): void {
  const sharebox = document.querySelector('[data-testid="mainFeed"] > :has(#draft-text-replaceable-component)');
  if (!sharebox) {
    document.getElementById('lt-compose')?.remove();
    return;
  }
  let el = document.getElementById('lt-compose');
  const sig = JSON.stringify(identities);
  if (!el || signatures.get('lt-compose') !== sig) {
    const next = renderCompose({ identities });
    if (el) {
      // Keep what was typed when the identity list changes under us.
      const typed = el.querySelector('textarea')?.value ?? '';
      const textarea = next.querySelector('textarea');
      if (textarea) {
        textarea.value = typed;
        textarea.dispatchEvent(new Event('input'));
      }
      el.replaceWith(next);
    }
    el = next;
    signatures.set('lt-compose', sig);
  }
  if (sharebox.previousElementSibling !== el) sharebox.before(el);
}
