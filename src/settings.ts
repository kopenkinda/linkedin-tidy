import { config, mutedWords, OPTIONS, PAGES, setConfig, setMutedWords, type ConfigKey, type PageId } from './config';
import { h, icon, type Icon } from './dom';
import { ICONS } from './icons';

// Quick settings under the games row: theme, language, the LinkedIn Plus dialog and LinkedIn's
// footer links.

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

// LinkedIn's interface languages, as its footer's language picker lists them. The picker
// saves the choice to the account and reloads; ours does the same from any page.
const LOCALES: [code: string, name: string][] = [
  ['ar_AE', 'العربية'], ['bn_IN', 'বাংলা'], ['cs_CZ', 'Čeština'], ['da_DK', 'Dansk'], ['de_DE', 'Deutsch'],
  ['el_GR', 'Ελληνικά'], ['en_US', 'English'], ['es_ES', 'Español'], ['fa_IR', 'فارسی'], ['fi_FI', 'Suomi'],
  ['fr_FR', 'Français'], ['hi_IN', 'हिंदी'], ['hu_HU', 'Magyar'], ['in_ID', 'Bahasa Indonesia'], ['it_IT', 'Italiano'],
  ['iw_IL', 'עברית'], ['ja_JP', '日本語'], ['ko_KR', '한국어'], ['mr_IN', 'मराठी'], ['ms_MY', 'Bahasa Malaysia'],
  ['nl_NL', 'Nederlands'], ['no_NO', 'Norsk'], ['pa_IN', 'ਪੰਜਾਬੀ'], ['pl_PL', 'Polski'], ['pt_BR', 'Português'],
  ['ro_RO', 'Română'], ['ru_RU', 'Русский'], ['sv_SE', 'Svenska'], ['te_IN', 'తెలుగు'], ['th_TH', 'ภาษาไทย'],
  ['tl_PH', 'Tagalog'], ['tr_TR', 'Türkçe'], ['uk_UA', 'Українська'], ['vi_VN', 'Tiếng Việt'], ['zh_CN', '简体中文'],
  ['zh_TW', '正體中文'],
];

const cookie = (name: string) => document.cookie.match(new RegExp(`(?:^|;\\s*)${name}="?([^";]*)`))?.[1];

/** The `lang` cookie holds "v=2&lang=ru-ru". */
function currentLocale(): string {
  const [lang = 'en', region = 'us'] = cookie('lang')?.match(/lang=(\w+)-(\w+)/)?.slice(1) ?? [];
  return `${lang.toLowerCase()}_${region.toUpperCase()}`;
}

async function setLocale(locale: string): Promise<boolean> {
  const response = await fetch('/psettings/select-language', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest', 'csrf-token': cookie('JSESSIONID') ?? '' },
    body: JSON.stringify({ locale }),
  });
  if (response.ok) location.reload();
  return response.ok;
}

// The page the dialog opens on: the settings for where you are.
const currentPage = (): PageId => (document.querySelector('[data-sdui-screen$=".profile.Profile"]') ? 'profile' : 'feed');

function selectPage(dialog: HTMLElement, page: PageId) {
  for (const tab of dialog.querySelectorAll<HTMLElement>('[role="tab"]')) tab.setAttribute('aria-selected', String(tab.dataset.page === page));
  for (const panel of dialog.querySelectorAll<HTMLElement>('[role="tabpanel"]')) panel.hidden = panel.dataset.page !== page;
}

function openConfig(onChange: () => void) {
  let dialog = document.getElementById('lt-config') as HTMLDialogElement | null;
  if (!dialog) {
    const current = config();
    const created = h('dialog', { id: 'lt-config', 'aria-labelledby': 'lt-config-title' },
      h('header', {},
        h('h2', { id: 'lt-config-title' }, 'LinkedIn Plus'),
        h('button', { type: 'button', class: 'lt-config-close', 'aria-label': 'Close' }, icon(ICONS.close))),
      h('p', { class: 'lt-config-desc' }, 'Tweaks on top of LinkedIn, by page. Saved in this browser.'),
      h('div', { class: 'lt-config-body' },
        h('nav', { role: 'tablist', 'aria-orientation': 'vertical', 'aria-label': 'Pages' },
          PAGES.map((p) => h('button', { type: 'button', role: 'tab', id: `lt-tab-${p.id}`, 'aria-controls': `lt-panel-${p.id}`, 'data-page': p.id }, p.label))),
        PAGES.map((p) => h('section', { role: 'tabpanel', id: `lt-panel-${p.id}`, 'aria-labelledby': `lt-tab-${p.id}`, 'data-page': p.id },
          OPTIONS.filter((o) => o.page === p.id).map((o) => h('label', { class: 'lt-option' },
            h('span', {}, h('strong', {}, o.label), h('small', {}, o.hint)),
            h('input', { type: 'checkbox', role: 'switch', 'data-key': o.key, checked: current[o.key] }))),
          p.id === 'feed' && h('label', { class: 'lt-option lt-muted-words' },
            h('span', {}, h('strong', {}, 'Muted words'), h('small', {}, 'One per line. Posts that mention any of them are filtered out.')),
            h('textarea', { rows: 4, spellcheck: 'false', placeholder: 'crypto\nopen to work' }, mutedWords().join('\n')))))));
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
      const target = e.target as Element;
      if (target === created || target.closest('.lt-config-close')) return created.close();
      const page = target.closest<HTMLElement>('[role="tab"]')?.dataset.page as PageId | undefined;
      if (page) selectPage(created, page);
    });
    document.body.append(created);
    dialog = created;
  }
  selectPage(dialog, currentPage());
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

// The sidebar's settings block: the theme toggle, LinkedIn Plus, and "Help & legal", which
// opens the footer links in a popover. It only depends on being placed, so any page's
// sidebar can host it: insert renderSettings() once (sync() with constant data), then call
// refreshSettings() on each update to reflect the current theme.

/** `onChange` re-runs the page update so a theme or config change applies right away. */
export function renderSettings(onChange: () => void): HTMLElement {
  const locale = currentLocale();
  const option = (value: Theme, label: string, svg: Icon) =>
    h('button', { type: 'button', role: 'radio', 'aria-label': label, title: label, 'data-theme': value }, icon(svg));
  const root = h('div', { id: 'lt-settings' },
    h('div', { class: 'lt-setting' },
      h('div', { role: 'radiogroup', 'aria-label': 'Theme' },
        option('light', 'Light', ICONS.sun),
        option('dark', 'Dark', ICONS.moon),
        option('system', 'System', ICONS.monitor)),
      h('label', { class: 'lt-language', title: 'Language' },
        icon(ICONS.languages),
        h('select', { 'aria-label': 'Language' },
          LOCALES.map(([code, name]) => h('option', { value: code, selected: code === locale }, name))),
        icon(ICONS.chevronDown))),
    h('div', { class: 'lt-setting' },
      h('button', { type: 'button', class: 'lt-plus', 'data-action': 'config' }, icon(ICONS.sliders), 'LinkedIn Plus'),
      h('button', { type: 'button', class: 'lt-plus', popovertarget: 'lt-links' }, icon(ICONS.info), 'Help & legal')),
    h('div', { id: 'lt-links', popover: '' },
      h('div', { class: 'lt-links-groups' },
        FOOTER.map(([group, links]) => h('div', {},
          h('h3', {}, group),
          links.map(([label, href]) => h('a', { href }, label))))),
      h('p', {}, `LinkedIn Corporation © ${new Date().getFullYear()}`)));
  root.addEventListener('click', (e) => {
    const target = e.target as Element;
    if (target.closest('[data-action="config"]')) return openConfig(onChange);
    const value = target.closest<HTMLElement>('[data-theme]')?.dataset.theme as Theme | undefined;
    // No "already selected" shortcut: the cookie can match while the page shows something
    // else (another tab changed it), and re-applying is harmless.
    if (value) {
      setTheme(value);
      onChange();
    }
  });
  root.addEventListener('change', (e) => {
    const select = e.target as HTMLSelectElement;
    setLocale(select.value).then(
      (ok) => ok || (select.value = locale),
      (error) => {
        console.warn('[LinkedIn Plus]', error);
        select.value = locale;
      });
  });
  return root;
}

export function refreshSettings(): void {
  const theme = themePreference();
  for (const option of document.querySelectorAll<HTMLElement>('#lt-settings [data-theme]')) {
    const checked = String(option.dataset.theme === theme);
    if (option.getAttribute('aria-checked') !== checked) option.setAttribute('aria-checked', checked);
  }
}
