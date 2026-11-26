import { h } from './dom';

// The global header, on both frontends: the React header on most pages and the older
// Ember one (#global-nav) on messaging. styles.css lines the header up with the page
// and hides For Business and Learning; their links move into the More menu here. The
// footer links live in the settings menu (settings.ts).

// LinkedIn sizes the page container at breakpoints (1128px on wide windows, 960px below
// that, ...). Measure it rather than copying the breakpoints, and give the header row
// the same width through --lt-page-width.
const PAGE = '#workspace > div, .scaffold-layout__inner';
let measured: Element | undefined;
const pageSize = new ResizeObserver(([entry]) => {
  const width = entry?.borderBoxSize[0]?.inlineSize;
  if (width) document.documentElement.style.setProperty('--lt-page-width', `${width}px`);
});

export function matchPageWidth(): void {
  const page = document.querySelector(PAGE);
  if (!page || page === measured) return;
  if (measured) pageSize.unobserve(measured);
  measured = page;
  pageSize.observe(page);
}

const FOR_BUSINESS: [label: string, href: string][] = [
  ['Hire on LinkedIn', 'https://www.linkedin.com/talent/post-a-job/'],
  ['Sell with LinkedIn', 'https://business.linkedin.com/sales-solutions'],
  ['Advertise on LinkedIn', 'https://business.linkedin.com/advertise'],
  ['Premium', 'https://premium.linkedin.com/'],
  ['Learning for teams', 'https://learning.linkedin.com/'],
  ['Services Marketplace', 'https://www.linkedin.com/services/'],
  ['Admin Center', 'https://business.linkedin.com/talent-solutions/customer/admin-center'],
  ['Create a Company Page', 'https://www.linkedin.com/company/setup/new/'],
];

const group = (label: string, links: [string, string][]) =>
  h('details', {}, h('summary', {}, label), links.map(([text, href]) => h('a', { href, role: 'menuitem' }, text)));

export function extendMoreMenu(): void {
  // React renders the More menu as [role=menu]; Ember as a dropdown. Both list Groups.
  for (const menu of document.querySelectorAll('[role="menu"], .global-nav__more-menu-content .artdeco-dropdown__content-inner')) {
    if (menu.querySelector('.lt-more') || !menu.querySelector('a[href*="/groups/"]')) continue;
    menu.append(h('div', { class: 'lt-more' },
      h('a', { href: 'https://www.linkedin.com/learning/', role: 'menuitem' }, 'Learning'),
      group('For Business', FOR_BUSINESS)));
  }
}
