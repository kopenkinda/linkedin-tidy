// ==UserScript==
// @name         LinkedIn Tidy
// @version      0.2.0
// @description  Two-column, shadcn-styled LinkedIn without the clutter.
// @match        https://www.linkedin.com/*
// @run-at       document-start
// @noframes
// @grant        none
// ==/UserScript==

// LinkedIn Tidy. The same file is the MV3 content script and the Tampermonkey script.
//
// LinkedIn currently ships two frontends:
// - React (feed, profile, jobs, ...): hashed classes and hashed CSS variables. We hook
//   into named `componentkey`s, `data-testid`s, aria-labels and hrefs, never classes.
//   `data-view-name` looks useful but is behind a feature flag and often absent.
// - Ember (messaging page, floating chat): readable classes and named design tokens.
(() => {
  if (window.__linkedinTidy) return;
  window.__linkedinTidy = true;

  const CSS = String.raw`
/* shadcn neutral. light-dark() resolves against LinkedIn's own color-scheme,
   so everything below follows its light/dark setting. */
:root, [data-color-scheme] {
  --lt-bg: light-dark(#ffffff, #0a0a0a);
  --lt-card: light-dark(#ffffff, #171717);
  --lt-fg: light-dark(#0a0a0a, #fafafa);
  --lt-muted: light-dark(#f5f5f5, #262626);
  --lt-muted-fg: light-dark(#737373, #a1a1a1);
  --lt-border: light-dark(#e5e5e5, rgb(255 255 255 / 0.1));
  --lt-primary: light-dark(#171717, #e5e5e5);
  --lt-radius: 12px;
  --lt-font: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
}

/* Ember UI tokens. The chat overlay sits in a shadow root on #interop-outlet;
   declarations on the host from outside win over its internal :host rules. */
html, #interop-outlet {
  --color-background-canvas: var(--lt-bg) !important;
  --color-background-container: var(--lt-card) !important;
  --color-text: var(--lt-fg) !important;
  --color-text-low-emphasis: var(--lt-muted-fg) !important;
  --color-border-faint: var(--lt-border) !important;
  --color-action: var(--lt-primary) !important;
}

/* One text size. LinkedIn's CSS is all inside @layer, so these unlayered,
   zero-specificity rules still beat it while anything below can override them. */
:where(#workspace) :where(:not(svg, svg *)) {
  font-family: var(--lt-font);
  font-size: 14px;
  line-height: 20px;
}

/* Feed (both the "For you" and "Network" tabs; the tab bar is the shared marker):
   two columns at 25/75. The right rail goes; profile and games move left. */
#workspace div:has(> section[aria-label="Primary content"] [componentkey="feed-tab-host_tab-bar"]) {
  grid-template-columns: 25fr 75fr;
  column-gap: 24px;
}
#workspace div:has(> section[aria-label="Primary content"] [componentkey="feed-tab-host_tab-bar"]) > aside[aria-label="Sidebar"] { grid-column: 1; }
#workspace div:has(> section[aria-label="Primary content"] [componentkey="feed-tab-host_tab-bar"]) > section { grid-column: 2; }
#workspace div:has(> section[aria-label="Primary content"] [componentkey="feed-tab-host_tab-bar"]) > aside[aria-label="Aside"] { display: none !important; }

/* Left rail: only our profile card and games row. */
aside[aria-label="Sidebar"] :has(> #feedIdentityModuleComponentRef) > :not(#lt-profile, #lt-games, #lt-settings) { display: none !important; }

/* Feed junk */
[data-testid="mainFeed"] > :has([componentkey^="Launchpad"]) { display: none !important; }
:is([data-testid="mainFeed"], [data-testid="NetworkFeedListCollection"]) [role="listitem"] { border-radius: var(--lt-radius); }

/* Cards we render */
.lt-card {
  display: block;
  margin-bottom: 8px;
  overflow: hidden;
  background: var(--lt-card);
  color: var(--lt-fg);
  border: 1px solid var(--lt-border);
  border-radius: var(--lt-radius);
  font-family: var(--lt-font);
}
.lt-card a { color: inherit; text-decoration: none; }
.lt-card p { margin: 0; }
.lt-card a:hover, .lt-about a:hover { background: var(--lt-muted); }

#lt-profile .lt-cover { display: block; height: 64px; background: var(--lt-muted) center / cover no-repeat; }
#lt-profile .lt-avatar { display: block; width: fit-content; margin: -32px 0 0 16px; position: relative; }
#lt-profile .lt-avatar:hover { background: none; }
#lt-profile .lt-avatar img { display: block; width: 64px; height: 64px; object-fit: cover; border-radius: 9999px; border: 3px solid var(--lt-card); background: var(--lt-card); }
#lt-profile .lt-body { display: grid; gap: 4px; padding: 8px 16px 12px; }
#lt-profile .lt-name { display: inline-flex; align-items: center; gap: 6px; font-size: 22px; line-height: 28px; font-weight: 600; letter-spacing: -0.02em; }
#lt-profile .lt-name:hover { background: none; text-decoration: underline; }
#lt-profile .lt-name svg { width: 16px; height: 16px; flex: none; color: var(--lt-muted-fg); }
#lt-profile .lt-headline { color: var(--lt-muted-fg); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
#lt-profile .lt-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin-top: 4px; color: var(--lt-muted-fg); }
#lt-profile .lt-company { display: inline-flex; align-items: center; gap: 6px; color: var(--lt-fg); }
#lt-profile .lt-company img { width: 16px; height: 16px; border-radius: 4px; }

/* Menu rows inside the profile card, sidebar-style */
#lt-profile .lt-menu { display: grid; padding: 6px; border-top: 1px solid var(--lt-border); }
#lt-profile .lt-menu a { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 8px; }
#lt-profile .lt-menu :is(svg, img) { width: 16px; height: 16px; flex: none; color: var(--lt-muted-fg); }
#lt-profile .lt-menu img { border-radius: 4px; }
#lt-profile .lt-menu strong { margin-left: auto; font-weight: 600; font-variant-numeric: tabular-nums; }
#lt-profile .lt-menu-label { padding: 6px 10px 2px; color: var(--lt-muted-fg); font-weight: 500; }

/* Games: one horizontally scrollable row */
#lt-games { display: flex; gap: 2px; padding: 6px; overflow-x: auto; scrollbar-width: none; overscroll-behavior-x: contain; }
#lt-games a { flex: 0 0 44px; display: grid; justify-items: center; gap: 4px; padding: 6px 0; border-radius: 8px; }
#lt-games img { width: 28px; height: 28px; border-radius: 6px; }
#lt-games span { font-weight: 500; font-variant-numeric: tabular-nums; }

/* Quick settings: bare rows in the column, no card */
#lt-settings { display: grid; gap: 4px; padding: 0 4px 0 8px; font-family: var(--lt-font); font-size: 14px; line-height: 20px; color: var(--lt-muted-fg); }
#lt-settings .lt-setting { display: flex; align-items: center; justify-content: space-between; }
#lt-settings [role="radiogroup"] { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--lt-border); border-radius: 8px; }
#lt-settings button { display: grid; place-items: center; width: 28px; height: 24px; padding: 0; border: 0; border-radius: 6px; background: none; color: var(--lt-muted-fg); cursor: pointer; }
#lt-settings button:hover { color: var(--lt-fg); }
#lt-settings button[aria-checked="true"] { background: var(--lt-muted); color: var(--lt-fg); }
#lt-settings svg { width: 16px; height: 16px; }

/* Footer links, folded into the nav's More menu */
.lt-about { margin-top: 4px; border-top: 1px solid var(--lt-border); font-family: var(--lt-font); font-size: 14px; line-height: 20px; }
.lt-about summary { display: flex; justify-content: space-between; padding: 8px 16px; cursor: pointer; list-style: none; color: var(--lt-muted-fg); }
.lt-about summary::-webkit-details-marker { display: none; }
.lt-about summary::after { content: "▾"; }
.lt-about[open] summary::after { content: "▴"; }
.lt-about a { display: block; padding: 6px 16px; color: var(--lt-fg); text-decoration: none; }
`;

  // React's semantic tokens have hashed names but readable values, always of the form
  // light-dark(<light>, <dark>). The light value tells us the role (canvas, text,
  // border, brand...); both sides are then pointed at shadcn neutrals.
  const LIGHT = {
    '#f4f2ee': '#ffffff', // page canvas -> background
    '#ffffff': '#ffffff', // card surface (kept; listed so its dark side gets remapped)
    'rgb(0 0 0 / 0.9)': '#0a0a0a', // text -> foreground
    'rgb(0 0 0 / 0.75)': '#0a0a0a',
    'rgb(0 0 0 / 0.6)': '#737373', // secondary text -> muted-foreground
    'rgb(140 140 140 / 0.2)': '#e5e5e5', // borders -> border
    'rgb(140 140 140 / 0.3)': '#e5e5e5',
    '#0a66c2': '#171717', // brand blue -> primary
    '#004182': '#262626', // brand blue, pressed -> primary/90
    '#e8f3ff': '#f5f5f5', // blue tint -> accent
  };
  const DARK = {
    '#000000': '#0a0a0a', // canvas -> background
    '#1b1f23': '#171717', // card surface -> card
    '#293037': '#171717',
    'rgb(255 255 255 / 0.9)': '#fafafa', // text -> foreground
    'rgb(255 255 255 / 0.75)': '#fafafa',
    'rgb(255 255 255 / 0.6)': '#a1a1a1', // secondary text -> muted-foreground
    'rgb(140 140 140 / 0.25)': 'rgb(255 255 255 / 0.1)', // borders -> border
    'rgb(140 140 140 / 0.3)': 'rgb(255 255 255 / 0.15)',
    'rgb(140 140 140 / 0.35)': 'rgb(255 255 255 / 0.15)',
    '#71b7fb': '#e5e5e5', // brand blue -> primary
    '#aad6ff': '#d4d4d4',
    '#222e4e': '#262626', // blue tint -> accent
    '#38434f': '#262626',
  };

  const FOOTER_LINKS = [
    ['About', 'https://about.linkedin.com/'],
    ['Accessibility', 'https://www.linkedin.com/accessibility'],
    ['Help Center', 'https://www.linkedin.com/help/linkedin'],
    ['Privacy Policy', 'https://www.linkedin.com/legal/privacy-policy'],
    ['User Agreement', 'https://www.linkedin.com/legal/user-agreement'],
    ['Cookie Policy', 'https://www.linkedin.com/legal/cookie-policy'],
    ['Ad Choices', 'https://www.linkedin.com/help/linkedin/answer/62931'],
    ['Get the app', 'https://www.linkedin.com/mobile/'],
  ];

  // Lucide icons as [tag, attrs] lists. LinkedIn blanks every innerHTML assignment
  // (a Trusted Types default policy), so SVG has to be built node by node.
  const ICONS = {
    verified: [['path', { d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z' }], ['path', { d: 'm9 12 2 2 4-4' }]],
    eye: [['path', { d: 'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0' }], ['circle', { cx: 12, cy: 12, r: 3 }]],
    chart: [['path', { d: 'M3 3v16a2 2 0 0 0 2 2h16' }], ['path', { d: 'M18 17V9' }], ['path', { d: 'M13 17V5' }], ['path', { d: 'M8 17v-3' }]],
    dashboard: [['rect', { width: 7, height: 9, x: 3, y: 3, rx: 1 }], ['rect', { width: 7, height: 5, x: 14, y: 3, rx: 1 }], ['rect', { width: 7, height: 9, x: 14, y: 12, rx: 1 }], ['rect', { width: 7, height: 5, x: 3, y: 16, rx: 1 }]],
    bookmark: [['path', { d: 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z' }]],
    sun: [['circle', { cx: 12, cy: 12, r: 4 }], ...['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map((d) => ['path', { d }])],
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    monitor: [['rect', { width: 20, height: 14, x: 2, y: 3, rx: 2 }], ['path', { d: 'M8 21h8' }], ['path', { d: 'M12 17v4' }]],
    settings: [['path', { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' }], ['circle', { cx: 12, cy: 12, r: 3 }]],
  };

  // The rows the Me menu offers that are worth one click from the feed.
  const STATS = [
    ['/me/profile-views/', ICONS.eye],
    ['/analytics/creator/content/', ICONS.chart],
  ];
  const SHORTCUTS = [
    ['Dashboard', 'https://www.linkedin.com/dashboard/', ICONS.dashboard],
    ['Saved posts', 'https://www.linkedin.com/my-items/saved-posts/', ICONS.bookmark],
    ['Settings', 'https://www.linkedin.com/mypreferences/d/', ICONS.settings],
  ];

  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null && v !== false) el.setAttribute(k, v);
    el.append(...children.flat().filter((c) => c != null && c !== false && c !== ''));
    return el;
  }

  function icon(shapes) {
    const svg = (tag, attrs) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      return el;
    };
    const root = svg('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
    root.append(...shapes.map(([tag, attrs]) => svg(tag, attrs)));
    return root;
  }

  function addStyle(id, text) {
    const el = h('style', { id });
    el.textContent = text;
    document.documentElement.append(el);
  }

  // "light-dark(rgb(0 0 0 / 0.9), #fff)" -> ["rgb(0 0 0 / 0.9)", "#fff"]
  function splitLightDark(value) {
    const inner = /^light-dark\((.*)\)$/i.exec(value)?.[1];
    if (!inner) return null;
    let depth = 0;
    for (let i = 0; i < inner.length; i++) {
      if (inner[i] === '(') depth++;
      else if (inner[i] === ')') depth--;
      else if (inner[i] === ',' && depth === 0) return [inner.slice(0, i), inner.slice(i + 1)].map((s) => s.trim().toLowerCase());
    }
    return null;
  }

  function applyPalette() {
    const cs = getComputedStyle(document.documentElement);
    const decls = [];
    for (const name of cs) {
      if (!name.startsWith('--')) continue;
      const pair = splitLightDark(cs.getPropertyValue(name).trim());
      if (pair && pair[0] in LIGHT) decls.push(`${name}:light-dark(${LIGHT[pair[0]]},${DARK[pair[1]] ?? pair[1]})`);
    }
    // [data-color-scheme] too, in case LinkedIn redeclares tokens where it sets the scheme.
    if (decls.length) addStyle('lt-palette', `:root,[data-color-scheme]{${decls.join(';')}}`);
    // Tokens appear once LinkedIn's stylesheet loads; Ember pages never have them.
    else if (document.readyState !== 'complete') requestAnimationFrame(applyPalette);
  }

  // --- Left rail -----------------------------------------------------------------

  function readProfile(identity) {
    const [media, info, company] = identity.querySelectorAll('a');
    if (!info) return null;
    const rail = identity.closest('aside');
    const ours = ':not(#lt-profile a)';
    const imgs = media ? [...media.querySelectorAll('img')] : [];
    const [name, headline, location] = [...info.querySelectorAll('p')].map((p) => p.textContent.trim());
    const stats = STATS.flatMap(([path, svg]) => {
      const a = rail?.querySelector(`a[href*="${path}"]${ours}`);
      const m = a?.getAttribute('aria-label')?.match(/^(.*?)\s+(\S+)$/);
      return m ? [{ href: a.href, label: m[1], value: m[2], svg }] : [];
    });
    // Pages you manage, from the hidden "Manage" card. The identity card's own
    // company link points at your profile, so it never matches /company/.
    const pages = new Map();
    for (const a of rail?.querySelectorAll(`a[href*="/company/"]${ours}`) ?? []) {
      pages.set(a.pathname, { href: a.href, name: a.textContent.trim(), logo: a.querySelector('img')?.src });
    }
    return {
      href: info.href,
      name,
      headline,
      location,
      avatar: imgs.find((i) => i.alt)?.src,
      cover: imgs.find((i) => !i.alt)?.src,
      verified: !!info.querySelector('svg[role="img"]'),
      company: company && { name: company.textContent.trim(), logo: company.querySelector('img')?.src },
      stats,
      pages: [...pages.values()],
    };
  }

  function row(href, glyph, label, value) {
    return h('a', { href }, glyph, h('span', {}, label), value != null && h('strong', {}, value));
  }

  function renderProfile(p) {
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

  // Every game seen this session, by link. LinkedIn re-renders the card in the background
  // and it comes back collapsed to four games; remembering the rest keeps the row whole.
  const knownGames = new Map();
  let lastExpand = 0;

  function readGames() {
    const card = document.querySelector('[componentkey="feedRightNavGamesComponentRef"]');
    if (!card) return knownGames.size ? [...knownGames.values()] : null;
    const links = [...card.querySelectorAll('a[href*="/games/"]')];
    // Collapsed: fewer games than we know of (four on first load). The card's only button
    // is the "Show more" toggle. Throttled so a misread can't flap it open and shut.
    if (links.length < Math.max(knownGames.size, 5) && Date.now() - lastExpand > 5000) {
      lastExpand = Date.now();
      card.querySelector('button')?.click();
    }
    for (const a of links) {
      knownGames.set(a.href, {
        href: a.href,
        name: a.getAttribute('aria-label')?.replace(/^Play\s+/, '') ?? '',
        icon: a.querySelector('img')?.src,
        // "Zip #619" sits next to "4 connections played", so read the title line only.
        number: a.querySelector('strong')?.parentElement.textContent.match(/#(\d+)/)?.[1],
      });
    }
    return knownGames.size ? [...knownGames.values()] : null;
  }

  function renderGames(games) {
    return h('nav', { id: 'lt-games', class: 'lt-card', 'aria-label': 'Today’s puzzles' },
      games.map((g) => h('a', { href: g.href, title: `${g.name} #${g.number}` }, h('img', { src: g.icon, alt: g.name }), h('span', {}, g.number))));
  }

  // Re-render only when the data changes, and put the node back if React moved it.
  const signatures = {};
  function sync(id, data, render, after) {
    let el = document.getElementById(id);
    if (!data) return el?.remove();
    const sig = JSON.stringify(data);
    if (!el || signatures[id] !== sig) {
      const next = render(data);
      el?.replaceWith(next);
      el = next;
      signatures[id] = sig;
    }
    if (after.nextElementSibling !== el) after.after(el);
    return el;
  }

  // --- Quick settings ---------------------------------------------------------------

  // LinkedIn keeps the theme per device in two cookies and calls no API. Its own
  // settings page (Settings > Display > Dark mode) writes them and flips the page live;
  // we do the same, so both stay in sync and the server renders the choice next load.
  // li_theme is light, dark or system ("Device settings", which follows the OS).
  const osDark = matchMedia('(prefers-color-scheme: dark)');

  function themePreference() {
    return document.cookie.match(/(?:^|;\s*)li_theme=(light|dark|system)/)?.[1] ?? 'system';
  }

  function applyTheme(preference) {
    const scheme = preference === 'system' ? (osDark.matches ? 'dark' : 'light') : preference;
    document.body.setAttribute('data-color-scheme', scheme); // React UI
    document.documentElement.classList.toggle('theme--mercado-dark', scheme === 'dark'); // Ember UI
  }

  function setTheme(preference) {
    const attrs = '; domain=www.linkedin.com; path=/; max-age=15552000; secure; samesite=lax';
    document.cookie = `li_theme=${preference}${attrs}`;
    document.cookie = `li_theme_set=user${attrs}`;
    applyTheme(preference);
    update();
  }

  // LinkedIn follows OS changes itself when the page loaded in system mode; this covers
  // switching to system on an already-open page.
  osDark.addEventListener('change', () => {
    if (themePreference() === 'system') applyTheme('system');
  });

  function renderSettings({ theme }) {
    const option = (value, label, svg) =>
      h('button', { type: 'button', role: 'radio', 'aria-checked': String(theme === value), 'aria-label': label, title: label, 'data-theme': value }, icon(svg));
    const root = h('div', { id: 'lt-settings' },
      h('div', { class: 'lt-setting' },
        h('span', {}, 'Theme'),
        h('div', { role: 'radiogroup', 'aria-label': 'Theme' },
          option('light', 'Light', ICONS.sun),
          option('dark', 'Dark', ICONS.moon),
          option('system', 'System', ICONS.monitor))));
    root.addEventListener('click', (e) => {
      const value = e.target.closest('[data-theme]')?.dataset.theme;
      if (value && value !== themePreference()) setTheme(value);
    });
    return root;
  }

  // --- Nav ------------------------------------------------------------------------

  function addFooterToMoreMenu() {
    for (const menu of document.querySelectorAll('[role="menu"]')) {
      if (menu.querySelector('.lt-about') || !menu.querySelector('a[href*="/groups/"]')) continue;
      menu.append(h('details', { class: 'lt-about' },
        h('summary', {}, 'About & legal'),
        FOOTER_LINKS.map(([label, href]) => h('a', { href, role: 'menuitem' }, label))));
    }
  }

  // --- Wiring -----------------------------------------------------------------------

  function update() {
    const identity = document.getElementById('feedIdentityModuleComponentRef');
    if (identity) {
      const profile = sync('lt-profile', readProfile(identity), renderProfile, identity);
      const games = sync('lt-games', readGames(), renderGames, profile ?? identity);
      sync('lt-settings', { theme: themePreference() }, renderSettings, games ?? profile ?? identity);
    }
    addFooterToMoreMenu();
  }

  addStyle('lt-style', CSS);
  applyPalette();

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
