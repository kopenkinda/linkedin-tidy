import { config, mutedWords, OPTIONS, setConfig, setMutedWords, type ConfigKey } from './config';
import { h, icon, type Icon } from './dom';
import { ICONS } from './icons';

// Quick settings under the games row: the theme toggle and the LinkedIn Plus dialog.

// LinkedIn keeps the theme per device in two cookies and calls no API. Its own settings
// page (Settings > Display > Dark mode) writes them and flips the page live; we do the
// same, so both stay in sync and the server renders the choice next load.
// li_theme is light, dark or system ("Device settings", which follows the OS).
export type Theme = 'light' | 'dark' | 'system';

const osDark = matchMedia('(prefers-color-scheme: dark)');

export function themePreference(): Theme {
  return (document.cookie.match(/(?:^|;\s*)li_theme=(light|dark|system)/)?.[1] as Theme | undefined) ?? 'system';
}

function applyTheme(preference: Theme) {
  const scheme = preference === 'system' ? (osDark.matches ? 'dark' : 'light') : preference;
  document.body.setAttribute('data-color-scheme', scheme); // React UI
  document.documentElement.classList.toggle('theme--mercado-dark', scheme === 'dark'); // Ember UI
}

function setTheme(preference: Theme) {
  const attrs = '; domain=www.linkedin.com; path=/; max-age=15552000; secure; samesite=lax';
  for (const name of ['li_theme', 'li_theme_set']) {
    // A second copy (host-only, or on .linkedin.com) can sit next to the one LinkedIn's
    // settings page writes. The browser sends both and themePreference() reads the older
    // one, so the toggle acts on a stale value. Drop the other copies first.
    document.cookie = `${name}=; path=/; max-age=0`;
    document.cookie = `${name}=; domain=.linkedin.com; path=/; max-age=0`;
  }
  document.cookie = `li_theme=${preference}${attrs}`;
  document.cookie = `li_theme_set=user${attrs}`;
  applyTheme(preference);
}

// LinkedIn's ThemeProvider follows OS changes when the page loaded in system mode, and
// then sets the body attribute itself, which would undo an explicit choice made since.
// Re-apply ours after its handler has run; for system this also covers switching to
// system on an already-open page.
export function followOsTheme(): void {
  osDark.addEventListener('change', () => setTimeout(() => applyTheme(themePreference())));
}

function openConfig(onChange: () => void) {
  let dialog = document.getElementById('lt-config') as HTMLDialogElement | null;
  if (!dialog) {
    const current = config();
    const created = h('dialog', { id: 'lt-config', 'aria-labelledby': 'lt-config-title' },
      h('header', {},
        h('h2', { id: 'lt-config-title' }, 'LinkedIn Plus'),
        h('button', { type: 'button', class: 'lt-config-close', 'aria-label': 'Close' }, icon(ICONS.close))),
      h('p', { class: 'lt-config-desc' }, 'Tweaks on top of LinkedIn. Saved in this browser.'),
      OPTIONS.map((o) => h('label', { class: 'lt-option' },
        h('span', {}, h('strong', {}, o.label), h('small', {}, o.hint)),
        h('input', { type: 'checkbox', role: 'switch', 'data-key': o.key, checked: current[o.key] }))),
      h('label', { class: 'lt-option lt-muted-words' },
        h('span', {}, h('strong', {}, 'Muted words'), h('small', {}, 'One per line. Posts that mention any of them are filtered out.')),
        h('textarea', { rows: 4, spellcheck: 'false', placeholder: 'crypto\nopen to work' }, mutedWords().join('\n'))));
    // A textarea fires `change` when it loses focus, which closing the dialog also causes.
    created.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (input instanceof HTMLTextAreaElement) {
        setMutedWords([...new Set(input.value.split(/[\n,]/).map((w) => w.trim()).filter(Boolean))]);
      } else {
        setConfig(input.dataset.key as ConfigKey, input.checked);
      }
      onChange();
    });
    // Close on the X or a click on the backdrop (the dialog element itself).
    created.addEventListener('click', (e) => {
      if (e.target === created || (e.target as Element).closest('.lt-config-close')) created.close();
    });
    document.body.append(created);
    dialog = created;
  }
  dialog.showModal();
}

// LinkedIn's footer links (in the page footer and the right rail), grouped. Its "Business
// Services" list is the More menu's For Business group (nav.ts).
const FOOTER: [group: string, links: [label: string, href: string][]][] = [
  ['Help', [
    ['Help Center', 'https://www.linkedin.com/help/linkedin'],
    ['Accessibility', 'https://www.linkedin.com/accessibility'],
  ]],
  ['Legal', [
    ['Privacy Policy', 'https://www.linkedin.com/legal/privacy-policy'],
    ['User Agreement', 'https://www.linkedin.com/legal/user-agreement'],
    ['Cookie Policy', 'https://www.linkedin.com/legal/cookie-policy'],
    ['Copyright Policy', 'https://www.linkedin.com/legal/copyright-policy'],
    ['Pages Terms', 'https://www.linkedin.com/legal/l/linkedin-pages-terms'],
    ['Ad Choices', 'https://www.linkedin.com/help/linkedin/answer/62931'],
  ]],
  ['LinkedIn', [
    ['About', 'https://about.linkedin.com/'],
    ['Careers', 'https://careers.linkedin.com/'],
    ['Get the app', 'https://www.linkedin.com/mobile/'],
  ]],
];

// The settings menu: one button in a sidebar that opens a popover with the theme and
// LinkedIn Plus on top, then the footer links. It only depends on being placed, so any
// page's sidebar can host it: insert renderMenu() once (sync() with constant data), then
// call refreshMenu() on each update to reflect the current theme.

/** `onChange` re-runs the page update so a theme or config change applies right away. */
export function renderMenu(onChange: () => void): HTMLElement {
  const option = (value: Theme, label: string, svg: Icon) =>
    h('button', { type: 'button', role: 'radio', 'aria-label': label, title: label, 'data-theme': value }, icon(svg));
  const menu = h('div', { id: 'lt-menu', popover: '' },
    h('div', { class: 'lt-menu-row' },
      h('span', {}, 'Theme'),
      h('div', { role: 'radiogroup', 'aria-label': 'Theme' },
        option('light', 'Light', ICONS.sun),
        option('dark', 'Dark', ICONS.moon),
        option('system', 'System', ICONS.monitor))),
    h('button', { type: 'button', class: 'lt-menu-row', 'data-action': 'config' }, h('span', {}, 'LinkedIn Plus'), icon(ICONS.sliders)),
    h('hr'),
    h('div', { class: 'lt-menu-links' },
      FOOTER.map(([group, links]) => h('div', {},
        h('h3', {}, group),
        links.map(([label, href]) => h('a', { href }, label))))),
    h('p', { class: 'lt-menu-copy' }, `LinkedIn Corporation © ${new Date().getFullYear()}`));
  menu.addEventListener('click', (e) => {
    const target = e.target as Element;
    if (target.closest('[data-action="config"]')) {
      menu.hidePopover();
      return openConfig(onChange);
    }
    const value = target.closest<HTMLElement>('[data-theme]')?.dataset.theme as Theme | undefined;
    // No "already selected" shortcut: the cookie can match while the page shows something
    // else (another tab changed it), and re-applying is harmless.
    if (value) {
      setTheme(value);
      onChange();
    }
  });
  return h('div', { id: 'lt-settings' },
    h('button', { type: 'button', popovertarget: 'lt-menu' }, h('span', {}, 'Settings'), icon(ICONS.settings)),
    menu);
}

export function refreshMenu(): void {
  const theme = themePreference();
  for (const option of document.querySelectorAll<HTMLElement>('#lt-menu [data-theme]')) {
    const checked = String(option.dataset.theme === theme);
    if (option.getAttribute('aria-checked') !== checked) option.setAttribute('aria-checked', checked);
  }
}
