import { h, icon, type Child, type Icon } from './dom';
import { ICONS } from './icons';

// Our profile card and games row, filled from LinkedIn's (hidden) identity, dashboard,
// manage and puzzles cards.

export interface Profile {
  href: string;
  name: string;
  headline: string;
  location: string;
  avatar?: string;
  cover?: string;
  verified: boolean;
  company?: { name: string; logo?: string };
  stats: { href: string; label: string; value: string; svg: Icon }[];
  pages: Page[];
}

export interface Page {
  href: string;
  name: string;
  logo?: string;
}

// The Me-menu rows worth one click from the feed.
const STATS: [path: string, svg: Icon][] = [
  ['/me/profile-views/', ICONS.eye],
  ['/analytics/creator/content/', ICONS.chart],
];
const SHORTCUTS: [label: string, href: string, svg: Icon][] = [
  ['Dashboard', 'https://www.linkedin.com/dashboard/', ICONS.dashboard],
  ['Saved posts', 'https://www.linkedin.com/my-items/saved-posts/', ICONS.bookmark],
  ['Settings', 'https://www.linkedin.com/mypreferences/d/', ICONS.settings],
];

const text = (el: Element | null | undefined) => el?.textContent?.trim() ?? '';

export function readProfile(identity: Element): Profile | null {
  const [media, info, company] = identity.querySelectorAll('a');
  if (!info) return null;
  const rail = identity.closest('aside');
  const ours = ':not(#lt-profile a)';
  const imgs = media ? [...media.querySelectorAll('img')] : [];
  const [name = '', headline = '', location = ''] = [...info.querySelectorAll('p')].map(text);
  const stats = STATS.flatMap(([path, svg]) => {
    const a = rail?.querySelector<HTMLAnchorElement>(`a[href*="${path}"]${ours}`);
    // "Profile viewers 36"; some languages put the number in brackets.
    const m = a?.getAttribute('aria-label')?.match(/^(.*?)\s+\(?([\d\s.,]+)\)?$/);
    return a && m?.[1] && m[2] ? [{ href: a.href, label: m[1], value: m[2], svg }] : [];
  });
  // Pages you manage, from the hidden "Manage" card. The identity card's own company
  // link points at your profile, so it never matches /company/.
  const pages = new Map<string, Page>();
  for (const a of rail?.querySelectorAll<HTMLAnchorElement>(`a[href*="/company/"]${ours}`) ?? []) {
    pages.set(a.pathname, { href: a.href, name: text(a), logo: a.querySelector('img')?.src });
  }
  return {
    href: info.href,
    name,
    headline,
    location,
    avatar: imgs.find((i) => i.alt)?.src,
    cover: imgs.find((i) => !i.alt)?.src,
    verified: !!info.querySelector('svg[role="img"]'),
    company: company && { name: text(company), logo: company.querySelector('img')?.src },
    stats,
    pages: [...pages.values()],
  };
}

function row(href: string, glyph: Child, label: string, value?: string) {
  return h('a', { href }, glyph, h('span', {}, label), value != null && h('strong', {}, value));
}

export function renderProfile(p: Profile): HTMLElement {
  return h('section', { id: 'lt-profile', class: 'lt-card' },
    h('a', { class: 'lt-cover', href: p.href, tabindex: '-1', 'aria-hidden': 'true', style: p.cover && `background-image:url("${p.cover}")` }),
    h('a', { class: 'lt-avatar', href: p.href, tabindex: '-1', 'aria-hidden': 'true' }, p.avatar && h('img', { src: p.avatar, alt: '' })),
    h('div', { class: 'lt-body' },
      h('a', { class: 'lt-name', href: p.href }, p.name, p.verified && icon(ICONS.verified)),
      h('p', { class: 'lt-headline' }, p.headline),
      h('p', { class: 'lt-meta' },
        p.location && h('span', {}, p.location),
        p.company && h('span', { class: 'lt-company' }, p.company.logo && h('img', { src: p.company.logo, alt: '' }), p.company.name))),
    h('nav', { class: 'lt-menu', 'aria-label': 'Your activity' },
      p.stats.map((s) => row(s.href, icon(s.svg), s.label, s.value)),
      SHORTCUTS.map(([label, href, svg]) => row(href, icon(svg), label))),
    p.pages.length > 0 && h('nav', { class: 'lt-menu', 'aria-label': 'Your pages' },
      h('p', { class: 'lt-menu-label' }, 'Pages'),
      p.pages.map((pg) => row(pg.href, pg.logo && h('img', { src: pg.logo, alt: '' }), pg.name))));
}

export interface Game {
  href: string;
  name: string;
  icon?: string;
  number?: string;
}

// Every game seen this session, by link. LinkedIn's card starts collapsed to four games
// and comes back collapsed when it re-renders in the background; remembering the rest
// keeps the row whole.
const knownGames = new Map<string, Game>();
let expanded = false;
let tries = 0;
let retry: number | undefined;

export function readGames(): Game[] | null {
  const card = document.querySelector('[componentkey="feedRightNavGamesComponentRef"]');
  const links = [...(card?.querySelectorAll<HTMLAnchorElement>('a[href*="/games/"]') ?? [])];
  if (links.length > 4) expanded = true;
  // Open the card with its only button ("Show more"). A click that lands before LinkedIn
  // has wired the button up is lost, and then nothing changes on the page to run update()
  // again. So re-check on a timer until the card opens, giving up after a few tries in
  // case the markup changes.
  const button = card?.querySelector('button');
  if (!expanded && button && retry === undefined && tries < 10) {
    tries++;
    button.click();
    retry = window.setTimeout(() => {
      retry = undefined;
      readGames();
    }, 1000);
  }
  for (const a of links) {
    knownGames.set(a.href, {
      href: a.href,
      name: text(a.querySelector('strong')),
      icon: a.querySelector('img')?.src,
      // "Zip #619" ("Zip № 619" in some languages) sits next to "4 connections played", so
      // read the title line only.
      number: text(a.querySelector('strong')?.parentElement).match(/(\d+)$/)?.[1],
    });
  }
  return knownGames.size ? [...knownGames.values()] : null;
}

export function renderGames(games: Game[]): HTMLElement {
  return h('nav', { id: 'lt-games', class: 'lt-card', 'aria-label': 'Today’s puzzles' },
    games.map((g) => h('a', { href: g.href, title: `${g.name} #${g.number}` }, h('img', { src: g.icon, alt: g.name }), h('span', {}, g.number))));
}
