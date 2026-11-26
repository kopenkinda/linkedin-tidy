import { config } from './config';
import { h, icon, sync, type Icon } from './dom';
import { ICONS } from './icons';
import { personHead, type Person } from './rail';
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

// The top card: name, headline, then location next to "Contact info".
function readPerson(page: Element): Person | null {
  const top = page.querySelector('[componentkey$="Topcard"]');
  const h2 = top?.querySelector('h2');
  if (!top || !h2) return null;
  let info = h2.parentElement;
  while (info && info !== top && !info.querySelector('a[href*="/overlay/contact-info/"]')) info = info.parentElement;
  const link = h2.closest('a');
  const avatar = top.querySelector<HTMLImageElement>('[componentkey="topcard-logo-image-referencekey"] img')?.src;
  const cover = top.querySelector<HTMLImageElement>('figure img')?.src;
  return {
    href: link?.href ?? location.href,
    name: text(h2),
    headline: text(info?.querySelector(':scope > p')),
    location: text(info?.querySelector(':scope > div:has(a[href*="/overlay/contact-info/"]) > p')),
    avatar,
    cover: cover === avatar ? undefined : cover,
    verified: !!link?.querySelector('svg'),
  };
}

// Always at the top of the sidebar. LinkedIn's sticky bar (shown once the top card scrolls
// away) is hidden, and its action buttons are moved onto the empty actions row (styles.css):
// that bar sits outside the page's scroll container, so the moved buttons keep up with the
// sticky sidebar, and their menus open beside them.
function renderMini(p: Person): HTMLElement {
  return h('section', { id: 'lt-mini', class: 'lt-card' }, personHead(p), h('div', { class: 'lt-mini-actions' }));
}

// While the top card is in view LinkedIn makes the bar inert and aria-hidden, which would
// disable the moved buttons. Undo that whenever it's set; the rest of the bar stays hidden.
const awake = new WeakSet<Element>();
const wake = (bar: Element) => {
  if (bar.hasAttribute('inert')) bar.removeAttribute('inert');
  if (bar.hasAttribute('aria-hidden')) bar.removeAttribute('aria-hidden');
};
const barWatch = new MutationObserver((records) => records.forEach((r) => wake(r.target as Element)));

function keepBarAwake(page: Element) {
  const bar = page.querySelector('[role="toolbar"]');
  if (!bar || awake.has(bar)) return;
  awake.add(bar);
  wake(bar);
  barWatch.observe(bar, { attributes: true, attributeFilter: ['inert', 'aria-hidden'] });
}

export function updateProfile(onChange: () => void): void {
  const page = document.querySelector(PROFILE);
  const main = page?.querySelector('#workspace section');
  const aside = page?.querySelector('#workspace aside');
  document.documentElement.toggleAttribute('data-lt-hide-suggestions', config().hideProfileSuggestions);
  if (!page || !main || !aside?.firstElementChild) return;
  keepBarAwake(page);
  // After LinkedIn's (hidden) content.
  const mini = sync('lt-mini', readPerson(page), renderMini, aside.firstElementChild);
  const dashboard = sync('lt-dashboard', readDashboard(main, aside), renderDashboard, mini ?? aside.firstElementChild);
  sync('lt-settings', true, () => renderSettings(onChange), dashboard ?? mini ?? aside.firstElementChild);
  refreshSettings();
}
