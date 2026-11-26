import { config } from './config';
import { h, icon, sync, type Icon } from './dom';
import { ICONS } from './icons';
import { refreshSettings, renderSettings } from './settings';

// Profile pages get the feed's two columns: a sidebar on the left, the profile on the
// right. On your own profile the sidebar starts with one card: your dashboard numbers and
// the profile language and public URL settings, read from LinkedIn's cards (styles.css
// hides those, and the rest of its right rail). Then the quick settings.

const PROFILE = '[data-sdui-screen$=".profile.Profile"]';

interface Row {
  href: string;
  label: string;
  value: string;
  svg: Icon;
}

export interface Dashboard {
  title: string;
  stats: Row[];
  settings: Row[];
}

const STATS: [path: string, svg: Icon][] = [
  ['/analytics/profile-views/', ICONS.eye],
  ['/analytics/creator/content/', ICONS.chart],
  ['/analytics/search-appearances/', ICONS.search],
];

const text = (el: Element | null | undefined) => el?.textContent?.trim() ?? '';

// The "Private to you" dashboard card: three links that each start with their number
// ("36 profile views").
function readStats(main: Element) {
  const card = main.querySelector('section:has(a[href*="/analytics/search-appearances/"]):not(:has(section a[href*="/analytics/"]))');
  const stats = STATS.flatMap(([path, svg]): Row[] => {
    const a = card?.querySelector<HTMLAnchorElement>(`a[href*="${path}"]`);
    const m = text(a?.querySelector('p')).match(/^([\d\s.,]+?)\s+(.+)$/);
    return a && m?.[1] && m[2] ? [{ href: a.href, value: m[1], label: m[2].charAt(0).toUpperCase() + m[2].slice(1), svg }] : [];
  });
  return { title: text(card?.querySelector('h2')), stats };
}

// The profile language and public profile card: each heading has an edit link, and its
// value follows ("English", "www.linkedin.com/in/you").
function readSettings(aside: Element): Row[] {
  const card = aside.querySelector('[componentkey$="SupportedLocales"]');
  const values = [...(card?.querySelectorAll('p') ?? [])].map(text);
  return [...(card?.querySelectorAll('h2') ?? [])].flatMap((h2, i): Row[] => {
    const a = h2.parentElement?.querySelector<HTMLAnchorElement>('a[href]');
    return a ? [{ href: a.href, label: text(h2), value: (values[i] ?? '').replace(/^www\./, ''), svg: i ? ICONS.link : ICONS.languages }] : [];
  });
}

function readDashboard(main: Element, aside: Element): Dashboard | null {
  const d = { ...readStats(main), settings: readSettings(aside) };
  return d.stats.length || d.settings.length ? d : null;
}

function renderDashboard(d: Dashboard): HTMLElement {
  return h('nav', { id: 'lt-dashboard', class: 'lt-card', 'aria-label': d.title },
    d.stats.length > 0 && h('div', { class: 'lt-menu' },
      d.title && h('p', { class: 'lt-menu-label' }, d.title),
      d.stats.map((r) => h('a', { href: r.href }, icon(r.svg), h('span', {}, r.label), h('strong', {}, r.value)))),
    d.settings.length > 0 && h('div', { class: 'lt-menu' },
      d.settings.map((r) => h('a', { href: r.href }, icon(r.svg), h('span', { class: 'lt-stack' }, r.label, h('small', {}, r.value))))));
}

export function updateProfile(onChange: () => void): void {
  const page = document.querySelector(PROFILE);
  const main = page?.querySelector('#workspace section');
  const aside = page?.querySelector('#workspace aside');
  document.documentElement.toggleAttribute('data-lt-hide-suggestions', config().hideProfileSuggestions);
  if (!main || !aside?.firstElementChild) return;
  // After LinkedIn's (hidden) content.
  const dashboard = sync('lt-dashboard', readDashboard(main, aside), renderDashboard, aside.firstElementChild);
  sync('lt-settings', true, () => renderSettings(onChange), dashboard ?? aside.firstElementChild);
  refreshSettings();
}
