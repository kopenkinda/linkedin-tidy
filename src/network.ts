import { h, icon, sync, type Icon } from './dom';
import { ICONS } from './icons';
import { refreshSettings, renderSettings } from './settings';

// My Network (Grow, Catch up, invitations): LinkedIn's sidebar becomes ours, like the
// profile's. Its "Manage my network" list is redrawn as one of our cards, with Invitations
// first (the empty "No pending invitations" card is hidden), then the quick settings. The ad,
// the footer links, the puzzles and Premium upsells go (styles.css).

// The screen marker sits inside the main column here (on the profile it wraps the page).
const SIDEBAR = '#workspace > div > div:has(> section [data-sdui-screen*=".mynetwork."]) > aside';
// The invitation manager has no "Manage my network" list: show the one read last.
const STORE = 'lt-network';

interface Row {
  href: string;
  label: string;
  count: string;
}

interface Network {
  title: string;
  rows: Row[];
}

const ROW_ICONS: [path: string, svg: Icon][] = [
  ['/invitation-manager/', ICONS.userPlus],
  ['/connections/', ICONS.users],
  ['/people-follow/', ICONS.userCheck],
  ['/groups/', ICONS.messages],
  ['/events/', ICONS.calendar],
  ['/company/', ICONS.building],
  ['/newsletters/', ICONS.newspaper],
];

const INVITATIONS: Row = { href: 'https://www.linkedin.com/mynetwork/invitation-manager/received/', label: 'Invitations', count: '' };

const text = (el: Element | null | undefined) => el?.textContent?.trim() ?? '';

// Each link is an icon, a label and, for most, a count ("Connections", "440").
function readNetwork(aside: Element): Network | null {
  const nav = aside.querySelector('nav');
  const rows = [...(nav?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])].map((a): Row => ({
    href: a.href,
    label: text(a.querySelector(':scope > :nth-child(2)')),
    count: text(a.querySelector(':scope > :nth-child(3)')),
  }));
  if (rows.length) {
    const network = { title: text(nav?.parentElement?.querySelector(':scope > p')), rows };
    localStorage.setItem(STORE, JSON.stringify(network));
    return network;
  }
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? 'null') as Network | null;
  } catch {
    return null;
  }
}

function renderNetwork(n: Network): HTMLElement {
  return h('nav', { id: 'lt-network', class: 'lt-card', 'aria-label': n.title },
    h('div', { class: 'lt-menu' },
      n.title && h('p', { class: 'lt-menu-label' }, n.title),
      [INVITATIONS, ...n.rows].map((r) => h('a', { href: r.href, 'aria-current': location.href.startsWith(r.href.replace(/\/received\/$/, '/')) ? 'page' : null },
        icon(ROW_ICONS.find(([path]) => r.href.includes(path))?.[1] ?? ICONS.link),
        h('span', {}, r.label),
        r.count && h('strong', {}, r.count)))));
}

export function updateNetwork(onChange: () => void): void {
  const aside = document.querySelector(SIDEBAR);
  const own = aside?.firstElementChild;
  if (!aside || !own) return;
  // After LinkedIn's (hidden) content. The page is part of the data so the current row
  // updates when you move between pages.
  const data = readNetwork(own);
  const network = sync('lt-network', data && { ...data, page: location.pathname }, renderNetwork, own);
  sync('lt-settings', true, () => renderSettings(onChange), network ?? own);
  refreshSettings();
}
