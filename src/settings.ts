import { config, OPTIONS, setConfig, type ConfigKey } from './config';
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

// LinkedIn follows OS changes itself when the page loaded in system mode; this covers
// switching to system on an already-open page.
export function followOsTheme(): void {
  osDark.addEventListener('change', () => {
    if (themePreference() === 'system') applyTheme('system');
  });
}

function openConfig() {
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
        h('input', { type: 'checkbox', role: 'switch', 'data-key': o.key, checked: current[o.key] }))));
    created.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      setConfig(input.dataset.key as ConfigKey, input.checked);
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

/** `onChange` re-renders the rail after the theme changes. */
export function renderSettings({ theme }: { theme: Theme }, onChange: () => void): HTMLElement {
  const option = (value: Theme, label: string, svg: Icon) =>
    h('button', { type: 'button', role: 'radio', 'aria-checked': String(theme === value), 'aria-label': label, title: label, 'data-theme': value }, icon(svg));
  const root = h('div', { id: 'lt-settings' },
    h('div', { class: 'lt-setting' },
      h('span', {}, 'Theme'),
      h('div', { role: 'radiogroup', 'aria-label': 'Theme' },
        option('light', 'Light', ICONS.sun),
        option('dark', 'Dark', ICONS.moon),
        option('system', 'System', ICONS.monitor))),
    h('button', { type: 'button', class: 'lt-plus', 'data-action': 'config' }, h('span', {}, 'LinkedIn Plus'), icon(ICONS.sliders)));
  root.addEventListener('click', (e) => {
    const target = e.target as Element;
    if (target.closest('[data-action="config"]')) return openConfig();
    const value = target.closest<HTMLElement>('[data-theme]')?.dataset.theme as Theme | undefined;
    if (value && value !== themePreference()) {
      setTheme(value);
      onChange();
    }
  });
  return root;
}
