import { config } from './config';
import { h, icon, sync, until, type Icon } from './dom';
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

// The top card's action buttons: Open to, Add section, Enhance profile and ⋯ on yours;
// Follow or Following, Connect, Message, ⋯ and the like on someone else's. LinkedIn also
// renders a hidden set for narrow windows, so start from the visible ⋯.
function topActions(page: Element): HTMLElement[] {
  const more = [...page.querySelectorAll('[componentkey$="Topcard"] button:has(svg#ellipses-horizontal-fill-small)')].find((b) => b.getClientRects().length);
  const row = more?.parentElement?.parentElement;
  const own = !!page.querySelector('button[componentkey$="_openToButton"]');
  return [...(row?.querySelectorAll<HTMLElement>('[data-display-contents] > :is(a, button)') ?? [])]
    // On your own profile only the two that open a menu: Open to and ⋯.
    .filter((el) => !own || el.hasAttribute('aria-expanded'));
}

// LinkedIn's icon on an action, as ours.
const ACTION_ICONS: [id: string, svg: Icon][] = [
  ['ellipses-horizontal', ICONS.ellipsis],
  ['person-plus', ICONS.userPlus], // Connect
  ['plus', ICONS.plus], // Follow
  ['check', ICONS.userCheck], // Following
  ['paper-plane', ICONS.send], // Message
];
const actionIcon = (id: string) => ACTION_ICONS.find(([prefix]) => id.startsWith(prefix))?.[1];

// The current companies and school next to the headline ("Stan + 2 more", "Universitat
// Pompeu Fabra"), told apart from other figures by LinkedIn's placeholder logo. Clicking
// one scrolls to Experience or Education.
const topOrgs = (page: Element) =>
  [...page.querySelectorAll<HTMLElement>('[componentkey$="Topcard"] [role="button"]:has(figure svg:is([id^="company-"], [id^="school-"]))')]
    .filter((el) => el.getClientRects().length);

export interface Mini extends Person {
  stats: { value: string; label: string; href?: string }[];
  orgs: { label: string; name: string; logo?: string }[];
  actions: { label: string; icon: string }[];
}

function readMini(page: Element): Mini | null {
  const person = readPerson(page);
  if (!person) return null;
  // "409,476 followers", "500+ connections": the top card's lines that start with a number.
  // Some profiles put the label on a line of its own ("500+", "connections").
  const stats = [...page.querySelectorAll('[componentkey$="Topcard"] p')].flatMap((p) => {
    const m = text(p).match(/^(\d[\d\s.,]*\+?)(?:\s+(\S.*))?$/);
    const label = m?.[2] ?? text(p.nextElementSibling);
    return m?.[1] && label ? [{ value: m[1], label, href: p.closest('a')?.href }] : [];
  });
  // Labelled with the heading of the section a click scrolls to, in the interface's language
  // ("Education", not "Education (2)").
  const orgs = topOrgs(page).map((el) => {
    const section = el.querySelector('figure svg[id^="school-"]') ? 'Education' : 'Experience';
    const heading = text(page.querySelector(`[componentkey$="${section}TopLevelSection"] h2`)).replace(/\s*\(\d+\)$/, '');
    return { label: heading || section, name: text(el), logo: el.querySelector('img')?.src };
  });
  const actions = topActions(page).map((el) => ({
    label: text(el) || (el.getAttribute('aria-label') ?? ''),
    icon: el.querySelector('svg[id]')?.id ?? '',
  }));
  return { ...person, stats, orgs, actions };
}

// Always at the top of the sidebar, with stand-ins for the top card's buttons that click the
// real ones. LinkedIn's own sticky bar, which repeats them once the top card scrolls away,
// is hidden (styles.css).
function renderMini(m: Mini): HTMLElement {
  const card = h('section', { id: 'lt-mini', class: 'lt-card' },
    personHead(m),
    m.stats.length > 0 && h('p', { class: 'lt-mini-stats' },
      m.stats.map((st) => h(st.href ? 'a' : 'span', { href: st.href }, h('strong', {}, st.value), ` ${st.label}`))),
    m.orgs.length > 0 && h('div', { class: 'lt-mini-orgs' },
      m.orgs.map((o, i) => h('button', { type: 'button', 'data-org': i },
        h('span', { class: 'lt-logo' }, o.logo && h('img', { src: o.logo, alt: '' })),
        h('span', { class: 'lt-stack' }, h('small', {}, o.label), h('span', {}, o.name))))),
    m.actions.length > 0 && h('div', { class: 'lt-mini-actions' },
      m.actions.map((a, i) => {
        const svg = actionIcon(a.icon);
        const more = svg === ICONS.ellipsis;
        return h('button', { type: 'button', 'data-index': i, 'aria-label': more ? a.label : null, class: more ? 'lt-more-button' : null },
          svg && icon(svg), !more && a.label);
      })));
  card.addEventListener('click', (e) => {
    const target = e.target as Element;
    const fake = target.closest<HTMLElement>('[data-index]');
    const org = target.closest<HTMLElement>('[data-org]');
    const page = document.querySelector(PROFILE);
    if (!page) return;
    if (fake) void press(page, Number(fake.dataset.index), fake);
    if (org) topOrgs(page)[Number(org.dataset.org)]?.click();
  });
  return card;
}

const openPopovers = () => [...document.querySelectorAll<HTMLElement>('[popover]:popover-open')];

// A menu (⋯, Open to) opens next to the button that was clicked, which may be scrolled off
// screen; pin the one that opens to our stand-in instead (styles.css, [data-lt-pinned]).
async function press(page: Element, index: number, fake: HTMLElement) {
  const real = topActions(page)[index];
  if (!real) return;
  const before = new Set(openPopovers());
  real.click();
  const menu = await until(() => openPopovers().find((p) => !before.has(p)), 1000).catch(() => undefined);
  if (!menu) return;
  for (const b of fake.parentElement?.children ?? []) (b as HTMLElement).style.removeProperty('anchor-name');
  fake.style.setProperty('anchor-name', '--lt-pressed');
  menu.setAttribute('data-lt-pinned', '');
  const unpin = (e: Event) => {
    if ((e as ToggleEvent).newState !== 'closed') return;
    menu.removeAttribute('data-lt-pinned');
    menu.removeEventListener('toggle', unpin);
  };
  menu.addEventListener('toggle', unpin);
}

export function updateProfile(onChange: () => void): void {
  const page = document.querySelector(PROFILE);
  const main = page?.querySelector('#workspace section');
  const aside = page?.querySelector('#workspace aside');
  document.documentElement.toggleAttribute('data-lt-hide-suggestions', config().hideProfileSuggestions);
  if (!page || !main || !aside?.firstElementChild) return;
  // After LinkedIn's (hidden) content.
  const mini = sync('lt-mini', readMini(page), renderMini, aside.firstElementChild);
  const dashboard = sync('lt-dashboard', readDashboard(main, aside), renderDashboard, mini ?? aside.firstElementChild);
  sync('lt-settings', true, () => renderSettings(onChange), dashboard ?? mini ?? aside.firstElementChild);
  refreshSettings();
}
