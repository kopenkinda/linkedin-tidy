import { config } from './config';
import { h, icon, sync, type Icon } from './dom';
import { ICONS } from './icons';
import { refreshSettings, renderSettings } from './settings';

// Profile pages get the feed's two columns: a sidebar on the left with your dashboard (on
// your own profile) and the quick settings, the profile on the right. styles.css moves
// LinkedIn's right rail over and hides all of it but the profile language card.

const PROFILE = '[data-sdui-screen$=".profile.Profile"]';

export interface Dashboard {
  title: string;
  rows: { href: string; label: string; value: string; svg: Icon }[];
}

const DASHBOARD: [path: string, svg: Icon][] = [
  ['/analytics/profile-views/', ICONS.eye],
  ['/analytics/creator/content/', ICONS.chart],
  ['/analytics/search-appearances/', ICONS.search],
];

// Only your own profile has the "Private to you" dashboard card: three links that each
// start with their number ("36 profile views").
function readDashboard(main: Element): Dashboard | null {
  const card = main.querySelector('section:has(a[href*="/analytics/search-appearances/"]):not(:has(section a[href*="/analytics/"]))');
  if (!card) return null;
  const rows = DASHBOARD.flatMap(([path, svg]) => {
    const a = card.querySelector<HTMLAnchorElement>(`a[href*="${path}"]`);
    const m = a?.querySelector('p')?.textContent?.trim().match(/^([\d\s.,]+?)\s+(.+)$/);
    return a && m?.[1] && m[2] ? [{ href: a.href, value: m[1], label: m[2].charAt(0).toUpperCase() + m[2].slice(1), svg }] : [];
  });
  return rows.length ? { title: card.querySelector('h2')?.textContent?.trim() ?? '', rows } : null;
}

function renderDashboard(d: Dashboard): HTMLElement {
  return h('nav', { id: 'lt-dashboard', class: 'lt-card', 'aria-label': d.title },
    h('div', { class: 'lt-menu' },
      d.title && h('p', { class: 'lt-menu-label' }, d.title),
      d.rows.map((r) => h('a', { href: r.href }, icon(r.svg), h('span', {}, r.label), h('strong', {}, r.value)))));
}

export function updateProfile(onChange: () => void): void {
  const page = document.querySelector(PROFILE);
  const main = page?.querySelector('#workspace section');
  const aside = page?.querySelector('#workspace aside');
  document.documentElement.toggleAttribute('data-lt-hide-suggestions', config().hideProfileSuggestions);
  if (!main || !aside?.firstElementChild) return;
  // Placed after LinkedIn's content; styles.css shows the dashboard first.
  const dashboard = sync('lt-dashboard', readDashboard(main), renderDashboard, aside.firstElementChild);
  sync('lt-settings', true, () => renderSettings(onChange), dashboard ?? aside.firstElementChild);
  refreshSettings();
}
