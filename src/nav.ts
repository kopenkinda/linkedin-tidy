import { h } from './dom';

// The global header, on both frontends: the React header on most pages and the older
// Ember one (#global-nav) on messaging. styles.css lines the header up with the page
// and hides For Business and Learning; their links move into the More menu here.

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
  ['Sell with LinkedIn', 'https://business.linkedin.com/sell'],
  ['Advertise on LinkedIn', 'https://business.linkedin.com/advertise'],
  ['Premium', 'https://premium.linkedin.com/'],
  ['Learning for teams', 'https://business.linkedin.com/learn'],
  ['Services Marketplace', 'https://www.linkedin.com/services/'],
  ['Admin Center', 'https://business.linkedin.com/hire/customer/admin-center'],
];

// The right rail's footer links.
const ABOUT: [label: string, href: string][] = [
  ['About', 'https://about.linkedin.com/'],
  ['Accessibility', 'https://www.linkedin.com/accessibility'],
  ['Help Center', 'https://www.linkedin.com/help/linkedin'],
  ['Privacy Policy', 'https://www.linkedin.com/legal/privacy-policy'],
  ['User Agreement', 'https://www.linkedin.com/legal/user-agreement'],
  ['Cookie Policy', 'https://www.linkedin.com/legal/cookie-policy'],
  ['Ad Choices', 'https://www.linkedin.com/help/linkedin/answer/62931'],
  ['Get the app', 'https://www.linkedin.com/mobile/'],
];

const group = (label: string, links: [string, string][]) =>
  h('details', {}, h('summary', {}, label), links.map(([text, href]) => h('a', { href, role: 'menuitem' }, text)));

export function extendMoreMenu(): void {
  // React renders the More menu as [role=menu]; Ember as a dropdown. Both list Groups.
  for (const menu of document.querySelectorAll('[role="menu"], .global-nav__more-menu-content .artdeco-dropdown__content-inner')) {
    if (menu.querySelector('.lt-more') || !menu.querySelector('a[href*="/groups/"]')) continue;
    menu.append(h('div', { class: 'lt-more' },
      h('a', { href: 'https://www.linkedin.com/learning/', role: 'menuitem' }, 'Learning'),
      group('For Business', FOR_BUSINESS),
      group('About & legal', ABOUT)));
  }
}
