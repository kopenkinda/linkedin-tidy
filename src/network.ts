import { config } from './config';
import { h, icon, sync, type Icon } from './dom';
import { ICONS } from './icons';
import { refreshSettings, renderSettings } from './settings';

// My Network (Grow, Catch up): LinkedIn's sidebar becomes ours, like the profile's. Its
// "Manage my network" list is redrawn as one of our cards, then the quick settings; the ad and
// the footer links go (styles.css). Premium upsells in the main column are hidden there too.

// The screen marker sits inside the main column here (on the profile it wraps the page).
const SIDEBAR = '#workspace > div > div:has(> section [data-sdui-screen*=".mynetwork."]) > aside';

interface Row {
  href: string;
  label: string;
  count: string;
}

const ROW_ICONS: [path: string, svg: Icon][] = [
  ['/connections/', ICONS.users],
  ['/people-follow/', ICONS.userCheck],
  ['/groups/', ICONS.messages],
  ['/events/', ICONS.calendar],
  ['/company/', ICONS.building],
  ['/newsletters/', ICONS.newspaper],
];

const text = (el: Element | null | undefined) => el?.textContent?.trim() ?? '';

// Each link is an icon, a label and, for most, a count ("Connections", "440").
function readNetwork(aside: Element) {
  const nav = aside.querySelector('nav');
  const rows = [...(nav?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])].map((a): Row => ({
    href: a.href,
    label: text(a.querySelector(':scope > :nth-child(2)')),
    count: text(a.querySelector(':scope > :nth-child(3)')),
  }));
  return rows.length ? { title: text(nav?.parentElement?.querySelector(':scope > p')), rows } : null;
}

function renderNetwork(n: { title: string; rows: Row[] }): HTMLElement {
  return h('nav', { id: 'lt-network', class: 'lt-card', 'aria-label': n.title },
    h('div', { class: 'lt-menu' },
      n.title && h('p', { class: 'lt-menu-label' }, n.title),
      n.rows.map((r) => h('a', { href: r.href },
        icon(ROW_ICONS.find(([path]) => r.href.includes(path))?.[1] ?? ICONS.link),
        h('span', {}, r.label),
        r.count && h('strong', {}, r.count)))));
}

export function updateNetwork(onChange: () => void): void {
  document.documentElement.toggleAttribute('data-lt-hide-games', config().hideGames);
  const aside = document.querySelector(SIDEBAR);
  const own = aside?.firstElementChild;
  if (!aside || !own) return;
  // After LinkedIn's (hidden) content.
  const network = sync('lt-network', readNetwork(own), renderNetwork, own);
  sync('lt-settings', true, () => renderSettings(onChange), network ?? own);
  refreshSettings();
}
