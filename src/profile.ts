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

// The visible ⋯ in the top card. LinkedIn also renders a hidden set of actions for narrow
// windows.
const moreButton = (page: Element) =>
  [...page.querySelectorAll<HTMLElement>('[componentkey$="Topcard"] button:has(svg#ellipses-horizontal-fill-small)')].find((b) => b.getClientRects().length);

// The top card's actions: Open to, Add section, Enhance profile and ⋯ on yours; Follow or
// Following, Connect, Message, a website link, ⋯ and the like on someone else's.
function topActions(page: Element): HTMLElement[] {
  const row = moreButton(page)?.parentElement?.parentElement;
  return [...(row?.querySelectorAll<HTMLElement>('[data-display-contents] > :is(a, button)') ?? [])]
    // On your own profile only the two that open a menu: Open to and ⋯.
    .filter((el) => !isOwn(page) || el.hasAttribute('aria-expanded'));
}
const isOwn = (page: Element) => !!page.querySelector('button[componentkey$="_openToButton"]');

// Connect and Follow sit in the top card on some profiles and in its ⋯ menu on others
// (whichever one the card doesn't show), and Following is in the menu once you're connected.
// The menu only exists while it's open, so open it once per profile, unseen (styles.css,
// [data-lt-ghost]), and note what it holds.
let menu: { path: string; items: { label: string; icon: string }[] } | undefined;
let probing = false;
let rerender = () => {};

const openPopovers = () => [...document.querySelectorAll<HTMLElement>('[popover]:popover-open')];

async function openMenu(trigger: HTMLElement, unseen: boolean) {
  const before = new Set(openPopovers());
  document.documentElement.toggleAttribute('data-lt-ghost', unseen);
  trigger.click();
  return until(() => openPopovers().find((p) => !before.has(p)), 1000).catch(() => undefined);
}

async function closeMenu(more: HTMLElement, m: HTMLElement | undefined) {
  const open = () => m?.isConnected && m.matches(':popover-open');
  if (open()) more.click();
  await until(() => !open(), 500).catch(() => undefined);
  document.documentElement.removeAttribute('data-lt-ghost');
}

const menuItems = (m: HTMLElement | undefined) => [...(m?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];

async function probeMenu(page: Element) {
  const more = moreButton(page);
  const path = location.pathname;
  if (!more || probing || menu?.path === path || isOwn(page)) return;
  probing = true;
  const focused = document.activeElement;
  const m = await openMenu(more, true);
  const items = menuItems(m).map((el) => ({ label: text(el), icon: el.querySelector('svg[id]')?.id ?? '' }));
  await closeMenu(more, m);
  // LinkedIn hands focus back to its ⋯, which may be far up the page.
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
  menu = { path, items };
  probing = false;
  rerender();
}

// LinkedIn's icon on an action, as ours, and the order they go in: Connect first, then
// Follow, as icons; then Message and the rest, labelled; ⋯ last.
const KINDS: [id: string, svg: Icon, iconOnly: boolean][] = [
  ['person-plus', ICONS.userPlus, true], // Connect
  ['plus', ICONS.plus, true], // Follow
  ['check', ICONS.userCheck, true], // Following
  ['paper-plane', ICONS.send, false], // Message
  ['ellipses-horizontal', ICONS.ellipsis, true],
];
const kind = (id: string) => {
  const i = KINDS.findIndex(([prefix]) => id.startsWith(prefix));
  const [, svg, iconOnly] = KINDS[i] ?? [];
  // Anything else (Open to, a newsletter, Pending) goes with Message, before ⋯.
  return { rank: i < 0 ? KINDS.length - 1.5 : i, svg, iconOnly: !!iconOnly };
};
const isConnect = (id: string) => id.startsWith('person-plus');
const isFollow = (id: string) => /^(plus|check)-/.test(id);

// Smaller pieces of the top card, each found by its icon or link rather than its words.
const TOP = '[componentkey$="Topcard"]';
const contactLink = (page: Element) => page.querySelector<HTMLElement>(`${TOP} a[href*="/overlay/contact-info/"]`);
const bellLink = (page: Element) => page.querySelector<HTMLElement>(`${TOP} a:has(svg[id^="bell-"])`);
// "Alex, Sam and 117 other mutual connections", "Followed by Robin and 11 others you know":
// a people search with faces or a people icon. The plain "500+ connections" link
// goes to the same search, without either.
const MUTUAL = `${TOP} a[href*="/search/results/people/"]:has(img, svg)`;

// The current companies and school next to the headline ("Acme + 2 more", "Example
// University"), told apart from other figures by LinkedIn's placeholder logo. Clicking
// one scrolls to Experience or Education.
const topOrgs = (page: Element) =>
  [...page.querySelectorAll<HTMLElement>('[componentkey$="Topcard"] [role="button"]:has(figure svg:is([id^="company-"], [id^="school-"]))')]
    .filter((el) => el.getClientRects().length);

interface Action {
  label: string;
  icon: string;
  /** Where the real one is: the top card's actions, or the ⋯ menu's items. */
  from: 'card' | 'menu';
  index: number;
}

export interface Mini extends Person {
  /** "1st", "2nd", "3rd". */
  degree: string;
  pronouns: string;
  influencer: boolean;
  contact: string;
  bell: string;
  mutual?: { text: string; href: string; faces: string[] };
  stats: { value: string; label: string; href?: string }[];
  orgs: { label: string; name: string; logo?: string }[];
  links: { label: string; name: string; href: string }[];
  actions: Action[];
}

function readMini(page: Element): Mini | null {
  const person = readPerson(page);
  if (!person) return null;
  // "409,476 followers", "500+ connections": the top card's lines that start with a number.
  // Some profiles put the label on a line of its own ("500+", "connections").
  const stats = [...page.querySelectorAll(`${TOP} p:not(${MUTUAL} p)`)].flatMap((p) => {
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
  const links: Mini['links'] = [];
  const actions: Action[] = [];
  topActions(page).forEach((el, index) => {
    const label = text(el) || (el.getAttribute('aria-label') ?? '');
    const icon = el.querySelector('svg[id]')?.id ?? '';
    if (el instanceof HTMLAnchorElement && !icon) {
      // "Visit my website": LinkedIn's /safety/go/ link, with the site in its url parameter.
      const url = new URL(el.href).searchParams.get('url');
      links.push({ href: el.href, label: url ? label : '', name: url ? url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : label });
    } else actions.push({ label, icon, from: 'card', index });
  });
  if (menu?.path === location.pathname) {
    menu.items.forEach(({ label, icon }, index) => {
      const wanted = isConnect(icon) ? isConnect : isFollow(icon) ? isFollow : undefined;
      if (wanted && !actions.some((a) => wanted(a.icon))) actions.push({ label, icon, from: 'menu', index });
    });
  }
  actions.sort((a, b) => kind(a.icon).rank - kind(b.icon).rank);
  // The lines next to the name: pronouns ("He/Him") and the degree ("· 3rd"). The name's row
  // is the info block's child that holds it.
  const h2 = page.querySelector(`${TOP} h2`);
  const info = contactLink(page)?.closest(`${TOP} :has(h2)`);
  const row = [...(info?.children ?? [])].find((c) => h2 && c.contains(h2));
  const beside = [...(row?.querySelectorAll(':scope > p') ?? [])].map(text);
  const degree = beside.find((t) => t.startsWith('·'))?.replace(/^·\s*/, '') ?? '';
  const pronouns = beside.find((t) => t && !t.startsWith('·')) ?? '';
  const mutual = page.querySelector<HTMLAnchorElement>(MUTUAL);
  return {
    ...person,
    degree,
    pronouns,
    influencer: !!page.querySelector(`${TOP} svg[id^="influencer-"]`),
    contact: text(contactLink(page)),
    bell: bellLink(page)?.getAttribute('aria-label') ?? '',
    mutual: mutual ? { text: text(mutual), href: mutual.href, faces: [...mutual.querySelectorAll('img')].slice(0, 3).map((i) => i.src) } : undefined,
    stats,
    orgs,
    links,
    actions,
  };
}

// Always at the top of the sidebar, with stand-ins for the top card's buttons that click the
// real ones. LinkedIn's own sticky bar, which repeats them once the top card scrolls away,
// is hidden (styles.css).
function renderMini(m: Mini): HTMLElement {
  // Connect when there is one, otherwise the first labelled action (Message, Open to).
  const primary = m.actions.find((a) => isConnect(a.icon)) ?? m.actions.find((a) => !kind(a.icon).iconOnly);
  const card = h('section', { id: 'lt-mini', class: 'lt-card' },
    m.bell && h('button', { type: 'button', class: 'lt-bell', 'data-real': 'bell', title: m.bell, 'aria-label': m.bell }, icon(ICONS.bell)),
    personHead(m, {
      badges: [
        m.influencer && h('span', { class: 'lt-influencer', title: 'LinkedIn Influencer' }, icon(ICONS.award)),
        m.degree && h('span', { class: 'lt-degree' }, m.degree),
        m.pronouns && h('span', { class: 'lt-pronouns' }, m.pronouns),
      ],
      meta: m.contact && h('button', { type: 'button', class: 'lt-contact', 'data-real': 'contact' }, m.contact),
    }),
    m.stats.length > 0 && h('p', { class: 'lt-mini-stats' },
      m.stats.map((st) => h(st.href ? 'a' : 'span', { href: st.href }, h('strong', {}, st.value), ` ${st.label}`))),
    m.mutual && h('a', { class: 'lt-mini-mutual', href: m.mutual.href },
      m.mutual.faces.length > 0 && h('span', { class: 'lt-faces' }, m.mutual.faces.map((src) => h('img', { src, alt: '' }))),
      h('span', {}, m.mutual.text)),
    m.orgs.length + m.links.length > 0 && h('div', { class: 'lt-mini-rows' },
      m.orgs.map((o, i) => h('button', { type: 'button', 'data-org': i },
        h('span', { class: 'lt-logo' }, o.logo ? h('img', { src: o.logo, alt: '' }) : icon(ICONS.building)),
        h('span', { class: 'lt-stack' }, h('small', {}, o.label), h('span', {}, o.name)))),
      m.links.map((l) => h('a', { href: l.href, target: '_blank', rel: 'noopener' },
        h('span', { class: 'lt-logo' }, icon(ICONS.link)),
        h('span', { class: 'lt-stack' }, l.label && h('small', {}, l.label), h('span', {}, l.name))))),
    m.actions.length > 0 && h('div', { class: 'lt-mini-actions' },
      m.actions.map((a, i) => {
        const { svg, iconOnly } = kind(a.icon);
        const classes = [iconOnly && 'lt-icon-button', svg === ICONS.ellipsis && 'lt-more-button', a === primary && 'lt-primary'];
        return h('button', { type: 'button', 'data-index': i, class: classes.filter(Boolean).join(' ') || null, title: iconOnly ? a.label : null, 'aria-label': iconOnly ? a.label : null },
          svg && icon(svg), !iconOnly && a.label);
      })));
  card.addEventListener('click', (e) => {
    const target = e.target as Element;
    const fake = target.closest<HTMLElement>('[data-index]');
    const org = target.closest<HTMLElement>('[data-org]');
    const real = target.closest<HTMLElement>('[data-real]')?.dataset.real;
    const page = document.querySelector(PROFILE);
    const action = fake && m.actions[Number(fake.dataset.index)];
    if (!page) return;
    if (fake && action) void press(page, action, fake);
    if (org) void fromTop(() => topOrgs(page)[Number(org.dataset.org)]).then((el) => el?.click());
    if (real) void fromTop(() => (real === 'bell' ? bellLink : contactLink)(page)).then((el) => el?.click());
  });
  return card;
}

// Back from a details page ("Show all"), LinkedIn restores the scroll position and leaves the
// cards above it as empty placeholders until you scroll up. The mini profile and dashboard then
// show what was read last time; a click that needs the top card scrolls up to it first.
const seen = new Map<string, { mini?: Mini; dashboard?: Dashboard }>();

async function fromTop<T>(find: () => T | null | undefined): Promise<T | undefined> {
  const found = find();
  if (found) return found;
  document.querySelector('#workspace')?.scrollTo({ top: 0 });
  return until(find, 3000).catch(() => undefined);
}

// Clicks the real action. One in the ⋯ menu is picked from the menu, unseen. A menu that opens
// (⋯, Open to) appears next to the button that was clicked, which may be scrolled off screen;
// pin it to our stand-in instead (styles.css, [data-lt-pinned]).
async function press(page: Element, action: Action, fake: HTMLElement) {
  const more = await fromTop(() => moreButton(page));
  let m: HTMLElement | undefined;
  if (action.from === 'menu') {
    if (!more) return;
    m = await openMenu(more, true);
    const item = menuItems(m)[action.index];
    if (item && item.querySelector('svg[id]')?.id === action.icon) {
      item.click();
      await closeMenu(more, m);
      // Follow turns into Following in the menu; read it again once LinkedIn has updated it.
      // Not after Connect, whose invite dialog is open by then.
      if (isFollow(action.icon)) setTimeout(() => { menu = undefined; rerender(); }, 1500);
      return;
    }
    // The menu changed since we read it: show it as it is.
    document.documentElement.removeAttribute('data-lt-ghost');
  } else {
    const real = topActions(page)[action.index];
    if (real) m = await openMenu(real, false);
  }
  if (!m) return;
  for (const b of fake.parentElement?.children ?? []) (b as HTMLElement).style.removeProperty('anchor-name');
  fake.style.setProperty('anchor-name', '--lt-pressed');
  m.setAttribute('data-lt-pinned', '');
  const unpin = (e: Event) => {
    if ((e as ToggleEvent).newState !== 'closed') return;
    m.removeAttribute('data-lt-pinned');
    m.removeEventListener('toggle', unpin);
  };
  m.addEventListener('toggle', unpin);
}

// Contact info opens in LinkedIn's own dialog: an icon, a label ("Email") and the value for
// each detail. With blurContacts on, the values are blurred (styles.css) and the first click on
// one shows it instead of following its link.
const CONTACT_VALUE = '[data-sdui-screen$=".ProfileContactDetailsOverlay"] svg[id] + div > p:not(:first-child)';
document.addEventListener('click', (e) => {
  const value = (e.target as Element).closest?.(CONTACT_VALUE);
  if (!value || !config().blurContacts || value.hasAttribute('data-lt-revealed')) return;
  e.preventDefault();
  e.stopPropagation();
  value.setAttribute('data-lt-revealed', '');
}, true);

// Languages: LinkedIn gives each one a tall row of its own, shows two, and links the rest to
// their details page. We list them one line each (styles.css hides LinkedIn's rows). With the
// allLanguages setting, the rest come from the details page's HTML (LinkedIn's sanitizer
// empties parsed HTML, hence the pattern: each row's first two lines), read once per profile.
// Off by default: requests LinkedIn didn't make can get the account flagged for scraping.
const allLanguages = new Map<string, string[][] | null>();

function readLanguages(card: Element, rows: Element[]): string[][] {
  const more = [...card.querySelectorAll<HTMLAnchorElement>('a[href$="/details/languages/"]')].find((a) => text(a));
  const all = config().allLanguages;
  // "Show all 3 languages", with its divider: only needed when we don't load the rest.
  const footer = more?.parentElement?.parentElement;
  if (footer) footer.style.display = all ? 'none' : '';
  const shown = rows.map((row) => [...row.querySelectorAll('p')].slice(0, 2).map(text));
  if (!more || !all) return shown;
  const url = more.href;
  if (!allLanguages.has(url)) {
    allLanguages.set(url, null);
    fetch(url, { credentials: 'include' })
      .then((r) => r.text())
      .then((html) => {
        const unescape = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, e: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"' })[e] ?? "'");
        allLanguages.set(url, html.split('componentkey="entity-collection-item').slice(1)
          .map((row) => [...row.slice(0, 3000).matchAll(/<p[^>]*>([^<]*)<\/p>/g)].slice(0, 2).map((m) => unescape(m[1]!.trim()))));
        rerender();
      })
      .catch(() => undefined);
  }
  return allLanguages.get(url) ?? shown;
}

function renderLanguages(languages: string[][]): HTMLElement {
  return h('dl', { id: 'lt-languages' }, languages.map(([name, level]) => [h('dt', {}, name), h('dd', {}, level)]));
}

function syncLanguages(page: Element) {
  const card = page.querySelector('[componentkey*="LanguageTopLevel"]');
  const rows = [...(card?.querySelectorAll('[componentkey^="entity-collection-item"]') ?? [])];
  const last = rows[rows.length - 1];
  if (card && last) sync('lt-languages', readLanguages(card, rows), renderLanguages, last);
}

export function updateProfile(onChange: () => void): void {
  const page = document.querySelector(PROFILE);
  const main = page?.querySelector('#workspace section');
  const aside = page?.querySelector('#workspace aside');
  document.documentElement.toggleAttribute('data-lt-hide-suggestions', config().hideProfileSuggestions);
  document.documentElement.toggleAttribute('data-lt-blur-contacts', config().blurContacts);
  if (!page || !main || !aside?.firstElementChild) return;
  rerender = onChange;
  void probeMenu(page);
  syncLanguages(page);
  // After LinkedIn's (hidden) content.
  const last = seen.get(location.pathname) ?? {};
  const miniData = readMini(page) ?? last.mini;
  // The dashboard's numbers come from the top of the page, its settings from the side.
  const read = readDashboard(main, aside);
  const dashboardData = read && !read.stats.length && last.dashboard?.stats.length ? { ...read, title: last.dashboard.title, stats: last.dashboard.stats } : read ?? last.dashboard;
  seen.set(location.pathname, { mini: miniData ?? undefined, dashboard: dashboardData ?? undefined });
  const mini = sync('lt-mini', miniData, renderMini, aside.firstElementChild);
  // On someone else's profile the mini profile stands in for LinkedIn's top card (styles.css).
  // Yours keeps it: that's where you edit your intro, photo and cover.
  document.documentElement.toggleAttribute('data-lt-mini-only', !!mini && !isOwn(page));
  const dashboard = sync('lt-dashboard', dashboardData, renderDashboard, mini ?? aside.firstElementChild);
  sync('lt-settings', true, () => renderSettings(onChange), dashboard ?? mini ?? aside.firstElementChild);
  refreshSettings();
}
