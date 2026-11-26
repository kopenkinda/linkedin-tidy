import { h, icon, sync, type Icon } from './dom';
import { ICONS } from './icons';
import { refreshSettings, renderSettings } from './settings';

// My Network (Grow, Catch up, invitations) and Jobs: LinkedIn's sidebar becomes ours, like
// the profile's. Its lists of links are redrawn as one of our cards, then the quick settings;
// the rest (profile card, ad, footer links) goes, as do Premium upsells (styles.css).

interface Row {
  href: string;
  label: string;
  count: string;
}

interface Group {
  title: string;
  rows: Row[];
}

interface Page {
  /** LinkedIn's sidebar on this page. */
  sidebar: string;
  /** Rows of ours, at the top of the first group. */
  first?: Row[];
  /** Where to keep the groups for pages of the same kind that lack the list. */
  store?: string;
}

const PAGES: Page[] = [
  // My Network's screen marker sits inside the main column (on Jobs it wraps the page). Its
  // empty "No pending invitations" card is hidden, so Invitations leads our card. The
  // invitation manager has no list of its own: it shows the one read last.
  {
    sidebar: '#workspace > div > div:has(> section [data-sdui-screen*=".mynetwork."]) > aside',
    first: [{ href: 'https://www.linkedin.com/mynetwork/invitation-manager/received/', label: 'Invitations', count: '' }],
    store: 'lt-network-groups',
  },
  { sidebar: '[data-sdui-screen$=".jobs.JobsHome"] #workspace > div > div > aside' },
];

const ROW_ICONS: [path: string, svg: Icon][] = [
  ['/invitation-manager/', ICONS.userPlus],
  ['/connections/', ICONS.users],
  ['/people-follow/', ICONS.userCheck],
  ['/groups/', ICONS.messages],
  ['/events/', ICONS.calendar],
  ['/company/', ICONS.building],
  ['/newsletters/', ICONS.newspaper],
  ['/jobs/preferences/', ICONS.sliders],
  ['/jobs-tracker/', ICONS.bookmark],
  ['/job-posting', ICONS.pen],
];

const text = (el: Element | null | undefined) => el?.textContent?.trim() ?? '';

// Each link is an icon, a label and sometimes a count ("Connections", "440"). Links with
// LinkedIn's Premium badge for an icon are upsells.
function readGroups(own: Element, page: Page): Group[] | null {
  const groups = [...own.querySelectorAll('nav')].map((nav): Group => ({
    title: text(nav.parentElement?.querySelector(':scope > p')),
    rows: [...nav.querySelectorAll<HTMLAnchorElement>('a[href]:not(:has(svg[id*="premium"]))')].map((a) => ({
      href: a.href,
      label: text(a.querySelector(':scope > :nth-child(2)')),
      count: text(a.querySelector(':scope > :nth-child(3)')),
    })),
  })).filter((g) => g.rows.length);
  if (!page.store) return groups.length ? groups : null;
  if (groups.length) {
    localStorage.setItem(page.store, JSON.stringify(groups));
    return groups;
  }
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(page.store) ?? 'null');
    return Array.isArray(stored) && stored.length ? (stored as Group[]) : null;
  } catch {
    return null;
  }
}

function renderSidebar(groups: Group[]): HTMLElement {
  return h('nav', { id: 'lt-sidebar', class: 'lt-card' },
    groups.map((g) => h('div', { class: 'lt-menu' },
      g.title && h('p', { class: 'lt-menu-label' }, g.title),
      g.rows.map((r) => h('a', { href: r.href, 'aria-current': location.href.startsWith(r.href.replace(/\/received\/$/, '/')) ? 'page' : null },
        icon(ROW_ICONS.find(([path]) => r.href.includes(path))?.[1] ?? ICONS.link),
        h('span', {}, r.label),
        r.count && h('strong', {}, r.count))))));
}

export function updateSidebar(onChange: () => void): void {
  for (const page of PAGES) {
    const own = document.querySelector(page.sidebar)?.firstElementChild;
    if (!own) continue;
    const groups = readGroups(own, page);
    if (groups && page.first) groups[0] = { ...groups[0]!, rows: [...page.first, ...groups[0]!.rows] };
    // After LinkedIn's (hidden) content. The path is part of the data so the current row
    // updates when you move between pages.
    const card = sync('lt-sidebar', groups && { groups, path: location.pathname }, (d) => renderSidebar(d.groups), own);
    sync('lt-settings', true, () => renderSettings(onChange), card ?? own);
    refreshSettings();
    return;
  }
}
