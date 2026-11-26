import { h } from './dom';

// The right rail's footer links, folded into the nav's More menu as "About & legal".
const FOOTER_LINKS: [label: string, href: string][] = [
  ['About', 'https://about.linkedin.com/'],
  ['Accessibility', 'https://www.linkedin.com/accessibility'],
  ['Help Center', 'https://www.linkedin.com/help/linkedin'],
  ['Privacy Policy', 'https://www.linkedin.com/legal/privacy-policy'],
  ['User Agreement', 'https://www.linkedin.com/legal/user-agreement'],
  ['Cookie Policy', 'https://www.linkedin.com/legal/cookie-policy'],
  ['Ad Choices', 'https://www.linkedin.com/help/linkedin/answer/62931'],
  ['Get the app', 'https://www.linkedin.com/mobile/'],
];

export function addFooterToMoreMenu(): void {
  for (const menu of document.querySelectorAll('[role="menu"]')) {
    // The More menu is the one with Groups in it.
    if (menu.querySelector('.lt-about') || !menu.querySelector('a[href*="/groups/"]')) continue;
    menu.append(h('details', { class: 'lt-about' },
      h('summary', {}, 'About & legal'),
      FOOTER_LINKS.map(([label, href]) => h('a', { href, role: 'menuitem' }, label))));
  }
}
