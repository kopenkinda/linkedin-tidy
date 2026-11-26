import { h, icon, sync } from './dom';
import { ICONS } from './icons';

// Messaging (Ember): one column. The sidebar goes (styles.css), and what's worth keeping from
// it, the "Page inboxes" of pages you manage, moves into the filter row above the
// conversations.

interface Inbox {
  href: string;
  name: string;
  logo?: string;
}

const text = (el: Element | null | undefined) => el?.textContent?.trim() ?? '';

function renderInboxes(d: { title: string; inboxes: Inbox[] }): HTMLElement {
  return h('nav', { id: 'lt-inboxes', 'aria-label': d.title, title: d.title },
    d.inboxes.map((i) => h('a', { href: i.href }, i.logo ? h('img', { src: i.logo, alt: '' }) : icon(ICONS.building), h('span', {}, i.name))));
}

export function updateMessaging(): void {
  const filters = document.querySelector('.msg-conversations-container__title-row > :first-child');
  if (!filters) return;
  const links = [...document.querySelectorAll<HTMLAnchorElement>('.msg-premium-mailboxes-card__link')];
  const inboxes = links.map((a): Inbox => ({ href: a.href, name: text(a), logo: a.querySelector('img')?.src }));
  const title = text(links[0]?.closest('section')?.querySelector('.text-heading-medium'));
  sync('lt-inboxes', inboxes.length ? { title, inboxes } : null, renderInboxes, filters);
}
