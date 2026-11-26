// ==UserScript==
// @name         LinkedIn Tidy
// @namespace    https://github.com/kopenkinda/linkedin-tidy
// @version      0.3.0.2
// @description  Two-column, shadcn-styled LinkedIn without the clutter.
// @homepageURL  https://github.com/kopenkinda/linkedin-tidy
// @updateURL    https://raw.githubusercontent.com/kopenkinda/linkedin-tidy/dist/linkedin-tidy.user.js
// @downloadURL  https://raw.githubusercontent.com/kopenkinda/linkedin-tidy/dist/linkedin-tidy.user.js
// @match        https://www.linkedin.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
"use strict";
(() => {
  // src/dom.ts
  function flatten(children, out = []) {
    for (const child of children) {
      if (Array.isArray(child)) flatten(child, out);
      else if (child != null && child !== false && child !== "") out.push(child);
    }
    return out;
  }
  function h(tag2, attrs = {}, ...children) {
    const el = document.createElement(tag2);
    for (const [key, value] of Object.entries(attrs)) {
      if (value != null && value !== false) el.setAttribute(key, String(value));
    }
    el.append(...flatten(children));
    return el;
  }
  function icon(shapes) {
    const svg = (tag2, attrs) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", tag2);
      for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
      return el;
    };
    const root = svg("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" });
    root.append(...shapes.map(([tag2, attrs]) => svg(tag2, attrs)));
    return root;
  }
  function addStyle(id, text5) {
    const el = h("style", { id });
    el.textContent = text5;
    document.documentElement.append(el);
  }
  function until(find, timeout = 6e3) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function poll() {
        const found = find();
        if (found) resolve(found);
        else if (Date.now() - start > timeout) reject(new Error("LinkedIn did not respond in time"));
        else setTimeout(poll, 50);
      })();
    });
  }
  var signatures = /* @__PURE__ */ new Map();
  function sync(id, data, render, after) {
    let el = document.getElementById(id) ?? void 0;
    if (!data) {
      el?.remove();
      return void 0;
    }
    const sig = JSON.stringify(data);
    if (!el || signatures.get(id) !== sig) {
      const next = render(data);
      el?.replaceWith(next);
      el = next;
      signatures.set(id, sig);
    }
    if (after.nextElementSibling !== el) after.after(el);
    return el;
  }

  // src/config.ts
  var PAGES = [
    { id: "general", label: "General" },
    { id: "feed", label: "Feed" },
    { id: "profile", label: "Profile" }
  ];
  var OPTIONS = [
    { page: "general", key: "quietHome", default: true, label: "Quiet Home", hint: "No notification dot on Home in the header." },
    { page: "general", key: "hideMessagingOverlay", default: false, label: "Hide the messaging overlay", hint: "The chat bar in the corner of every page. Messages stay on the Messaging page." },
    { page: "feed", key: "inlineComposer", default: true, label: "Open the composer in the feed", hint: "Off opens it as LinkedIn\u2019s popup." },
    { page: "feed", key: "instantFilePicker", default: false, label: "Open the file picker right away", hint: "When adding a photo or video. Off shows the upload screen first." },
    { page: "feed", key: "hideAds", default: true, label: "Hide promoted posts", hint: "Ads in the feed that look like regular posts." },
    { page: "feed", key: "hideGames", default: false, label: "Hide LinkedIn games", hint: "The puzzles row in the sidebar." },
    { page: "feed", key: "collapseFiltered", default: true, label: "Show muted posts as a line", hint: "Off hides posts with muted words completely." },
    { page: "profile", key: "hideProfileSuggestions", default: true, label: "Hide \u201CSuggested for you\u201D", hint: "LinkedIn\u2019s prompts to add to your profile, and people to follow." },
    { page: "profile", key: "allLanguages", default: false, label: "Show all languages", hint: "Loads a profile\u2019s full language list in the background instead of two and \u201CShow all\u201D. Risky: the extra requests can make LinkedIn warn you about scraping. If it does, turn this off." },
    { page: "profile", key: "blurContacts", default: true, label: "Blur contact info", hint: "Emails, phone numbers and links stay blurred until you click them. Safer when sharing your screen." }
  ];
  var CONFIG_KEY = "linkedin-plus";
  var nativeStorage;
  function storage() {
    if (!nativeStorage) {
      const frame = h("iframe", { hidden: true });
      document.documentElement.append(frame);
      const proto = frame.contentWindow?.Storage.prototype ?? Storage.prototype;
      const { getItem, setItem } = proto;
      frame.remove();
      nativeStorage = {
        get: (key) => getItem.call(localStorage, key),
        set: (key, value) => setItem.call(localStorage, key, value)
      };
    }
    return nativeStorage;
  }
  function saved() {
    try {
      return JSON.parse(storage().get(CONFIG_KEY) ?? "{}");
    } catch {
      return {};
    }
  }
  function save(patch) {
    storage().set(CONFIG_KEY, JSON.stringify({ ...saved(), ...patch }));
  }
  function config() {
    const values = saved();
    return Object.fromEntries(OPTIONS.map((o) => [o.key, typeof values[o.key] === "boolean" ? values[o.key] : o.default]));
  }
  function setConfig(key, value) {
    save({ [key]: value });
  }
  function mutedWords() {
    const words = saved().mutedWords;
    return Array.isArray(words) ? words.filter((w) => typeof w === "string") : [];
  }
  function setMutedWords(words) {
    save({ mutedWords: words });
  }

  // src/icons.ts
  var ICONS = {
    verified: [["path", { d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" }], ["path", { d: "m9 12 2 2 4-4" }]],
    eye: [["path", { d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" }], ["circle", { cx: 12, cy: 12, r: 3 }]],
    chart: [["path", { d: "M3 3v16a2 2 0 0 0 2 2h16" }], ["path", { d: "M18 17V9" }], ["path", { d: "M13 17V5" }], ["path", { d: "M8 17v-3" }]],
    dashboard: [["rect", { width: 7, height: 9, x: 3, y: 3, rx: 1 }], ["rect", { width: 7, height: 5, x: 14, y: 3, rx: 1 }], ["rect", { width: 7, height: 9, x: 14, y: 12, rx: 1 }], ["rect", { width: 7, height: 5, x: 3, y: 16, rx: 1 }]],
    bookmark: [["path", { d: "m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" }]],
    sun: [["circle", { cx: 12, cy: 12, r: 4 }], ...["M12 2v2", "M12 20v2", "m4.93 4.93 1.41 1.41", "m17.66 17.66 1.41 1.41", "M2 12h2", "M20 12h2", "m6.34 17.66-1.41 1.41", "m19.07 4.93-1.41 1.41"].map((d) => ["path", { d }])],
    moon: [["path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" }]],
    monitor: [["rect", { width: 20, height: 14, x: 2, y: 3, rx: 2 }], ["path", { d: "M8 21h8" }], ["path", { d: "M12 17v4" }]],
    image: [["rect", { width: 18, height: 18, x: 3, y: 3, rx: 2 }], ["circle", { cx: 9, cy: 9, r: 2 }], ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }]],
    article: [["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }], ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }], ["path", { d: "M16 13H8" }], ["path", { d: "M16 17H8" }], ["path", { d: "M10 9H8" }]],
    sliders: [["path", { d: "M20 7h-9" }], ["path", { d: "M14 17H5" }], ["circle", { cx: 17, cy: 17, r: 3 }], ["circle", { cx: 7, cy: 7, r: 3 }]],
    close: [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]],
    languages: [["path", { d: "m5 8 6 6" }], ["path", { d: "m4 14 6-6 2-3" }], ["path", { d: "M2 5h12" }], ["path", { d: "M7 2h1" }], ["path", { d: "m22 22-5-10-5 10" }], ["path", { d: "M14 18h6" }]],
    chevronDown: [["path", { d: "m6 9 6 6 6-6" }]],
    search: [["path", { d: "m21 21-4.34-4.34" }], ["circle", { cx: 11, cy: 11, r: 8 }]],
    building: [["path", { d: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" }], ["path", { d: "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" }], ["path", { d: "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" }], ["path", { d: "M10 6h4" }], ["path", { d: "M10 10h4" }], ["path", { d: "M10 14h4" }], ["path", { d: "M10 18h4" }]],
    pen: [["path", { d: "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }], ["path", { d: "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" }]],
    users: [["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }], ["circle", { cx: 9, cy: 7, r: 4 }], ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }], ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75" }]],
    messages: [["path", { d: "M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z" }], ["path", { d: "M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" }]],
    calendar: [["path", { d: "M8 2v4" }], ["path", { d: "M16 2v4" }], ["rect", { width: 18, height: 18, x: 3, y: 4, rx: 2 }], ["path", { d: "M3 10h18" }]],
    newspaper: [["path", { d: "M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" }], ["path", { d: "M18 14h-8" }], ["path", { d: "M15 18h-5" }], ["path", { d: "M10 6h8v4h-8V6Z" }]],
    bell: [["path", { d: "M10.268 21a2 2 0 0 0 3.464 0" }], ["path", { d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" }]],
    award: [["path", { d: "m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" }], ["circle", { cx: 12, cy: 8, r: 6 }]],
    link: [["path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }], ["path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" }]],
    ellipsis: [["circle", { cx: 12, cy: 12, r: 1 }], ["circle", { cx: 19, cy: 12, r: 1 }], ["circle", { cx: 5, cy: 12, r: 1 }]],
    plus: [["path", { d: "M5 12h14" }], ["path", { d: "M12 5v14" }]],
    userPlus: [["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }], ["circle", { cx: 9, cy: 7, r: 4 }], ["path", { d: "M19 8v6" }], ["path", { d: "M22 11h-6" }]],
    userCheck: [["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }], ["circle", { cx: 9, cy: 7, r: 4 }], ["path", { d: "m16 11 2 2 4-4" }]],
    send: [["path", { d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" }], ["path", { d: "m21.854 2.147-10.94 10.939" }]],
    info: [["circle", { cx: 12, cy: 12, r: 10 }], ["path", { d: "M12 16v-4" }], ["path", { d: "M12 8h.01" }]],
    settings: [["path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }], ["circle", { cx: 12, cy: 12, r: 3 }]]
  };

  // src/composer.ts
  var COMPOSE = '[data-sdui-screen$="ShareCompose"]';
  var dockRequestedAt = 0;
  function installComposerDock() {
    const showModal = HTMLDialogElement.prototype.showModal;
    HTMLDialogElement.prototype.showModal = function() {
      if (Date.now() - dockRequestedAt < 3e3 && this.matches('[data-testid="dialog"]')) {
        dockRequestedAt = 0;
        dock(this);
        return this.show();
      }
      return showModal.call(this);
    };
    for (const type of ["click", "keydown"]) {
      window.addEventListener(type, (e) => {
        if (e instanceof KeyboardEvent && e.key !== "Enter" && e.key !== " ") return;
        if (!e.target.closest?.("[data-lt-locked]")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
      }, true);
    }
  }
  var measured = false;
  var boxSize = new ResizeObserver(([entry]) => {
    const box = document.getElementById("lt-compose");
    const height = entry?.borderBoxSize[0]?.blockSize;
    if (box && height) box.style.minHeight = `${height}px`;
    if (height && !measured && entry.target.querySelector(COMPOSE)) {
      measured = true;
      document.documentElement.style.setProperty("--lt-composer-height", `${height}px`);
    }
  });
  function dock(dialog) {
    measured = false;
    dialog.setAttribute("data-lt-docked", "");
    document.getElementById("lt-compose")?.setAttribute("data-docked", "");
    boxSize.observe(dialog);
    dialog.addEventListener("close", () => {
      dialog.removeAttribute("data-lt-docked");
      boxSize.unobserve(dialog);
      const box = document.getElementById("lt-compose");
      box?.removeAttribute("data-docked");
      box?.style.removeProperty("min-height");
    }, { once: true });
  }
  var TAB_BAR = '[componentkey="feed-tab-host_tab-bar"]';
  var feedTabs = () => [...document.querySelectorAll(`${TAB_BAR} [role="button"]`)];
  var shareboxButton = () => document.getElementById("draft-text-replaceable-component")?.closest('[role="button"]');
  var returnToNetwork = false;
  async function openComposer(media) {
    let start = shareboxButton();
    const fromNetwork = !start;
    if (!start) {
      const [forYou] = feedTabs();
      if (!forYou) return;
      forYou.click();
      try {
        start = await until(shareboxButton);
      } catch (error) {
        console.warn("[LinkedIn Plus]", error);
        return;
      }
    }
    if (config().inlineComposer) {
      document.getElementById("lt-compose")?.scrollIntoView({ block: "nearest" });
      dockRequestedAt = Date.now();
    }
    start.click();
    try {
      const dialog = await until(() => document.querySelector(`dialog[open]:has(${COMPOSE})`));
      returnToNetwork = fromNetwork;
      if (media) (await until(() => dialog.querySelector("svg#image-outline-medium")?.closest("button"))).click();
    } catch (error) {
      console.warn("[LinkedIn Plus]", error);
    }
  }
  function renderCompose() {
    const root = h(
      "section",
      { id: "lt-compose", class: "lt-card", "aria-label": "Create a post" },
      h("button", { type: "button", class: "lt-compose-input", "data-action": "write" }, "Write a post\u2026"),
      h(
        "div",
        { class: "lt-compose-bar" },
        h("button", { type: "button", "data-action": "media" }, icon(ICONS.image), "Photo or video"),
        h("a", { href: "https://www.linkedin.com/article/new/" }, icon(ICONS.article), "Article")
      )
    );
    root.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action === "write") void openComposer(false);
      if (action === "media") void openComposer(true);
    });
    return root;
  }
  function placeCompose() {
    const tabs = document.querySelector(TAB_BAR);
    if (!tabs) {
      document.getElementById("lt-compose")?.remove();
      return;
    }
    const el = document.getElementById("lt-compose") ?? renderCompose();
    if (tabs.previousElementSibling !== el) tabs.before(el);
    if (el.hasAttribute("data-docked") && !document.querySelector("dialog[data-lt-docked][open]")) {
      el.removeAttribute("data-docked");
      el.style.removeProperty("min-height");
    }
    const network = feedTabs()[1];
    const writing = !!document.querySelector("dialog[data-lt-docked][open]");
    if (network && network.hasAttribute("data-lt-locked") !== writing) {
      network.toggleAttribute("data-lt-locked", writing);
      if (writing) network.setAttribute("aria-disabled", "true");
      else network.removeAttribute("aria-disabled");
    }
    if (returnToNetwork && !document.querySelector(`dialog[open] ${COMPOSE}`)) {
      returnToNetwork = false;
      until(() => !location.pathname.startsWith("/sharing/")).then(() => feedTabs()[1]?.click(), () => {
      });
    }
  }
  function tag(el, part) {
    if (el && el.getAttribute("data-lt-c") !== part) el.setAttribute("data-lt-c", part);
  }
  function tagParts(screen) {
    const identity = screen.querySelector('[role="button"][aria-label][aria-expanded]');
    const header = identity?.closest("div:has(figure)");
    tag(header?.firstElementChild, "avatar");
    tag(screen.querySelector('[role="button"][aria-labelledby][aria-expanded]')?.parentElement, "chips");
    const editorGrid = screen.querySelector('[data-testid="lazy-column"]')?.parentElement;
    const body = editorGrid?.parentElement;
    const bottom = editorGrid?.nextElementSibling;
    const rows = bottom?.firstElementChild;
    if (!body || !bottom || !rows) return;
    tag(body, "body");
    tag(body.parentElement?.parentElement, "main");
    tag(bottom, "flatten");
    tag(rows, "flatten");
    for (const row2 of rows.children) {
      if (row2.querySelector("svg#emoji-outline-medium")) tagToolbar(row2);
    }
    tag(rows.lastElementChild, "footer");
  }
  function tagToolbar(toolbar) {
    tag(toolbar, "toolbar");
    let row2 = toolbar;
    while (row2.children.length === 1 && row2.firstElementChild) row2 = row2.firstElementChild;
    tag(row2, "toolrow");
    for (const part of row2.children) {
      if (part.querySelector("svg#premium-chip-fill-color-small")) tag(part, "proofread");
      else if (part.querySelector("svg#emoji-outline-medium")) {
        tag(part, "tools");
        for (const group2 of part.children) {
          if (!group2.querySelector("svg#image-outline-medium")) continue;
          tag(group2, "insert");
          let items = group2.firstElementChild;
          while (items && items.children.length === 1) items = items.firstElementChild;
          tag(items, "items");
          for (const item of items?.children ?? []) {
            if (item.querySelector("svg#image-outline-medium")) tag(item, "media");
          }
          const toggle = group2.lastElementChild;
          if (toggle?.querySelector("svg#plus-outline-medium, svg#xmark-outline-medium") && !toggle.querySelector("svg#image-outline-medium")) tag(toggle, "more");
        }
      }
    }
  }
  var lastExpand = 0;
  function expandContentTypes(screen) {
    const plus = screen.querySelector('[data-lt-c="more"] svg#plus-outline-medium')?.closest("button");
    if (plus && Date.now() - lastExpand > 1e3) {
      lastExpand = Date.now();
      plus.click();
    }
  }
  var labelOf = (chip) => document.getElementById(chip.getAttribute("aria-labelledby") ?? "")?.textContent?.trim() ?? "";
  function visibilityLabel(screen, label) {
    if ((screen.querySelector('[data-lt-c="avatar"]')?.querySelectorAll("figure").length ?? 0) > 1) return "Visibility: Group";
    const value = label.replace(/^Post to\s+/i, "");
    return `Visibility: ${value === "Connections only" ? "Connections" : value}`;
  }
  var COMMENTS = { Anyone: "On", "Connections only": "Connections", Off: "Off", "No one": "Off" };
  function commentsLabel(label) {
    const value = label.replace(/^Comments:\s*/i, "");
    return `Comments: ${COMMENTS[value] ?? value}`;
  }
  function setLabel(chip, text5) {
    const node = chip.querySelector(":scope > div:last-child p span")?.firstChild;
    if (node?.nodeType === Node.TEXT_NODE && node.nodeValue !== text5) node.nodeValue = text5;
  }
  function relabel(screen) {
    if (!document.documentElement.lang.startsWith("en")) return;
    const [visibility, comments] = screen.querySelectorAll('[role="button"][aria-labelledby][aria-expanded]');
    if (visibility) setLabel(visibility, visibilityLabel(screen, labelOf(visibility)));
    if (comments) setLabel(comments, commentsLabel(labelOf(comments)));
  }
  var watched = /* @__PURE__ */ new WeakSet();
  function enhanceComposer() {
    const screen = document.querySelector(`dialog[open] ${COMPOSE}`);
    if (!screen) return;
    const apply = () => {
      tagParts(screen);
      expandContentTypes(screen);
      relabel(screen);
    };
    apply();
    if (watched.has(screen)) return;
    watched.add(screen);
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        apply();
      });
    }).observe(screen, { subtree: true, childList: true, characterData: true });
  }

  // src/feed.ts
  var POSTS = ':is([data-testid="mainFeed"], [data-testid="NetworkFeedListCollection"]) [role="listitem"]';
  var isAd = (post) => !post.querySelector("button svg#xmark-outline-small") && ![...post.querySelectorAll("p:has(svg)")].some((p) => p.textContent?.includes("\u2022"));
  var rules = { key: "", find: (_text) => void 0 };
  function updateRules(words) {
    const key = words.join("\n");
    if (key === rules.key) return false;
    const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const re = words.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join("|")})(?![\\p{L}\\p{N}])`, "iu") : void 0;
    rules = { key, find: (text5) => re?.exec(text5)?.[1] };
    return true;
  }
  function textOf(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const parts = [];
    while (walker.nextNode()) parts.push(walker.currentNode.nodeValue ?? "");
    return parts.join(" ");
  }
  function markPosts() {
    const { hideAds, collapseFiltered } = config();
    document.documentElement.toggleAttribute("data-lt-hide-ads", hideAds);
    document.documentElement.toggleAttribute("data-lt-collapse-filtered", collapseFiltered);
    const recheck = updateRules(mutedWords());
    for (const item of document.querySelectorAll(recheck ? POSTS : `${POSTS}:not([data-lt-ad])`)) {
      const post = item.querySelector("div:has(> h2)");
      if (!post?.querySelector("button svg#ellipses-horizontal-fill-small")) continue;
      item.setAttribute("data-lt-ad", String(isAd(post)));
      const word = rules.find(textOf(post));
      if (word) item.setAttribute("data-lt-muted", word);
      else item.removeAttribute("data-lt-muted");
    }
  }
  function installMutedReveal() {
    document.addEventListener("click", (e) => {
      const item = e.target.closest?.("[data-lt-muted]:not([data-lt-revealed])");
      if (!item || !document.documentElement.hasAttribute("data-lt-collapse-filtered")) return;
      e.preventDefault();
      e.stopPropagation();
      item.setAttribute("data-lt-revealed", "");
    }, true);
  }

  // src/nav.ts
  var PAGE = "#workspace > div, .scaffold-layout__inner";
  var measured2;
  var pageSize = new ResizeObserver(([entry]) => {
    const width = entry?.borderBoxSize[0]?.inlineSize;
    if (width) document.documentElement.style.setProperty("--lt-page-width", `${width}px`);
  });
  function pageContainer() {
    let page = document.querySelector(PAGE);
    const width = document.documentElement.clientWidth;
    for (let i = 0; page && i < 3 && page.getBoundingClientRect().width >= width - 1; i++) {
      const child = [...page.children].find((c) => c.getBoundingClientRect().width > 0);
      const r = child?.getBoundingClientRect();
      if (!child || !r || r.width < width - 1 && Math.abs(r.left - (width - r.right)) > 2) break;
      page = child;
    }
    return page;
  }
  function matchPageWidth() {
    const nav = document.getElementById("global-nav");
    document.documentElement.toggleAttribute("data-lt-nav-in-flow", !!nav && !/fixed|sticky/.test(getComputedStyle(nav).position));
    const page = pageContainer();
    if (!page || page === measured2) return;
    if (measured2) pageSize.unobserve(measured2);
    measured2 = page;
    pageSize.observe(page);
  }
  var FOR_BUSINESS = [
    ["Hire on LinkedIn", "https://www.linkedin.com/talent/post-a-job/"],
    ["Sell with LinkedIn", "https://business.linkedin.com/sales-solutions"],
    ["Advertise on LinkedIn", "https://business.linkedin.com/advertise"],
    ["Premium", "https://premium.linkedin.com/"],
    ["Learning for teams", "https://learning.linkedin.com/"],
    ["Services Marketplace", "https://www.linkedin.com/services/"],
    ["Admin Center", "https://business.linkedin.com/talent-solutions/customer/admin-center"],
    ["Create a Company Page", "https://www.linkedin.com/company/setup/new/"]
  ];
  var group = (label, links) => h("details", {}, h("summary", {}, label), links.map(([text5, href]) => h("a", { href, role: "menuitem" }, text5)));
  function extendMoreMenu() {
    for (const menu2 of document.querySelectorAll('[role="menu"], .global-nav__more-menu-content .artdeco-dropdown__content-inner')) {
      if (menu2.querySelector(".lt-more") || !menu2.querySelector('a[href*="/groups/"]')) continue;
      menu2.append(h(
        "div",
        { class: "lt-more" },
        h("a", { href: "https://www.linkedin.com/learning/", role: "menuitem" }, "Learning"),
        group("For Business", FOR_BUSINESS)
      ));
    }
  }

  // src/settings.ts
  var osDark = matchMedia("(prefers-color-scheme: dark)");
  function themePreference() {
    return document.cookie.match(/(?:^|;\s*)li_theme=(light|dark|system)/)?.[1] ?? "system";
  }
  function applyTheme(preference) {
    const scheme = preference === "system" ? osDark.matches ? "dark" : "light" : preference;
    document.body.setAttribute("data-color-scheme", scheme);
    document.documentElement.classList.toggle("theme--mercado-dark", scheme === "dark");
  }
  function setTheme(preference) {
    const attrs = "; domain=www.linkedin.com; path=/; max-age=15552000; secure; samesite=lax";
    for (const name of ["li_theme", "li_theme_set"]) {
      document.cookie = `${name}=; path=/; max-age=0`;
      document.cookie = `${name}=; domain=.linkedin.com; path=/; max-age=0`;
    }
    document.cookie = `li_theme=${preference}${attrs}`;
    document.cookie = `li_theme_set=user${attrs}`;
    applyTheme(preference);
  }
  function followOsTheme() {
    osDark.addEventListener("change", () => setTimeout(() => applyTheme(themePreference())));
  }
  var LOCALES = [
    ["ar_AE", "\u0627\u0644\u0639\u0631\u0628\u064A\u0629"],
    ["bn_IN", "\u09AC\u09BE\u0982\u09B2\u09BE"],
    ["cs_CZ", "\u010Ce\u0161tina"],
    ["da_DK", "Dansk"],
    ["de_DE", "Deutsch"],
    ["el_GR", "\u0395\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AC"],
    ["en_US", "English"],
    ["es_ES", "Espa\xF1ol"],
    ["fa_IR", "\u0641\u0627\u0631\u0633\u06CC"],
    ["fi_FI", "Suomi"],
    ["fr_FR", "Fran\xE7ais"],
    ["hi_IN", "\u0939\u093F\u0902\u0926\u0940"],
    ["hu_HU", "Magyar"],
    ["in_ID", "Bahasa Indonesia"],
    ["it_IT", "Italiano"],
    ["iw_IL", "\u05E2\u05D1\u05E8\u05D9\u05EA"],
    ["ja_JP", "\u65E5\u672C\u8A9E"],
    ["ko_KR", "\uD55C\uAD6D\uC5B4"],
    ["mr_IN", "\u092E\u0930\u093E\u0920\u0940"],
    ["ms_MY", "Bahasa Malaysia"],
    ["nl_NL", "Nederlands"],
    ["no_NO", "Norsk"],
    ["pa_IN", "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40"],
    ["pl_PL", "Polski"],
    ["pt_BR", "Portugu\xEAs"],
    ["ro_RO", "Rom\xE2n\u0103"],
    ["ru_RU", "\u0420\u0443\u0441\u0441\u043A\u0438\u0439"],
    ["sv_SE", "Svenska"],
    ["te_IN", "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41"],
    ["th_TH", "\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22"],
    ["tl_PH", "Tagalog"],
    ["tr_TR", "T\xFCrk\xE7e"],
    ["uk_UA", "\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430"],
    ["vi_VN", "Ti\u1EBFng Vi\u1EC7t"],
    ["zh_CN", "\u7B80\u4F53\u4E2D\u6587"],
    ["zh_TW", "\u6B63\u9AD4\u4E2D\u6587"]
  ];
  var cookie = (name) => document.cookie.match(new RegExp(`(?:^|;\\s*)${name}="?([^";]*)`))?.[1];
  function currentLocale() {
    const [lang = "en", region = "us"] = cookie("lang")?.match(/lang=(\w+)-(\w+)/)?.slice(1) ?? [];
    return `${lang.toLowerCase()}_${region.toUpperCase()}`;
  }
  async function setLocale(locale) {
    const response = await fetch("/psettings/select-language", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-requested-with": "XMLHttpRequest", "csrf-token": cookie("JSESSIONID") ?? "" },
      body: JSON.stringify({ locale })
    });
    if (response.ok) location.reload();
    return response.ok;
  }
  var currentPage = () => document.querySelector('[data-sdui-screen$=".profile.Profile"]') ? "profile" : document.getElementById("feedIdentityModuleComponentRef") ? "feed" : "general";
  function selectPage(dialog, page) {
    for (const tab of dialog.querySelectorAll('[role="tab"]')) tab.setAttribute("aria-selected", String(tab.dataset.page === page));
    for (const panel of dialog.querySelectorAll('[role="tabpanel"]')) panel.hidden = panel.dataset.page !== page;
  }
  function openConfig(onChange) {
    let dialog = document.getElementById("lt-config");
    if (!dialog) {
      const current = config();
      const created = h(
        "dialog",
        { id: "lt-config", "aria-labelledby": "lt-config-title" },
        h(
          "header",
          {},
          h("h2", { id: "lt-config-title" }, "LinkedIn Plus"),
          h("button", { type: "button", class: "lt-config-close", "aria-label": "Close" }, icon(ICONS.close))
        ),
        h("p", { class: "lt-config-desc" }, "Tweaks on top of LinkedIn, by page. Saved in this browser."),
        h(
          "div",
          { class: "lt-config-body" },
          h(
            "nav",
            { role: "tablist", "aria-orientation": "vertical", "aria-label": "Pages" },
            PAGES.map((p) => h("button", { type: "button", role: "tab", id: `lt-tab-${p.id}`, "aria-controls": `lt-panel-${p.id}`, "data-page": p.id }, p.label))
          ),
          PAGES.map((p) => h(
            "section",
            { role: "tabpanel", id: `lt-panel-${p.id}`, "aria-labelledby": `lt-tab-${p.id}`, "data-page": p.id },
            OPTIONS.filter((o) => o.page === p.id).map((o) => h(
              "label",
              { class: "lt-option" },
              h("span", {}, h("strong", {}, o.label), h("small", {}, o.hint)),
              h("input", { type: "checkbox", role: "switch", "data-key": o.key, checked: current[o.key] })
            )),
            p.id === "feed" && h(
              "label",
              { class: "lt-option lt-muted-words" },
              h("span", {}, h("strong", {}, "Muted words"), h("small", {}, "One per line. Posts that mention any of them are filtered out.")),
              h("textarea", { rows: 4, spellcheck: "false", placeholder: "crypto\nopen to work" }, mutedWords().join("\n"))
            )
          ))
        )
      );
      created.addEventListener("change", (e) => {
        const input = e.target;
        if (input instanceof HTMLTextAreaElement) {
          setMutedWords([...new Set(input.value.split(/[\n,]/).map((w) => w.trim()).filter(Boolean))]);
        } else {
          setConfig(input.dataset.key, input.checked);
        }
        onChange();
      });
      created.addEventListener("click", (e) => {
        const target = e.target;
        if (target === created || target.closest(".lt-config-close")) return created.close();
        const page = target.closest('[role="tab"]')?.dataset.page;
        if (page) selectPage(created, page);
      });
      document.body.append(created);
      dialog = created;
    }
    selectPage(dialog, currentPage());
    dialog.showModal();
  }
  var FOOTER = [
    ["Help", [
      ["Help Center", "https://www.linkedin.com/help/linkedin"],
      ["Accessibility", "https://www.linkedin.com/accessibility"]
    ]],
    ["Legal", [
      ["Privacy Policy", "https://www.linkedin.com/legal/privacy-policy"],
      ["User Agreement", "https://www.linkedin.com/legal/user-agreement"],
      ["Cookie Policy", "https://www.linkedin.com/legal/cookie-policy"],
      ["Copyright Policy", "https://www.linkedin.com/legal/copyright-policy"],
      ["Pages Terms", "https://www.linkedin.com/legal/l/linkedin-pages-terms"],
      ["Ad Choices", "https://www.linkedin.com/help/linkedin/answer/62931"]
    ]],
    ["LinkedIn", [
      ["About", "https://about.linkedin.com/"],
      ["Careers", "https://careers.linkedin.com/"],
      ["Get the app", "https://www.linkedin.com/mobile/"]
    ]]
  ];
  function renderSettings(onChange) {
    const locale = currentLocale();
    const option = (value, label, svg) => h("button", { type: "button", role: "radio", "aria-label": label, title: label, "data-theme": value }, icon(svg));
    const root = h(
      "div",
      { id: "lt-settings" },
      h(
        "div",
        { class: "lt-setting" },
        h(
          "div",
          { role: "radiogroup", "aria-label": "Theme" },
          option("light", "Light", ICONS.sun),
          option("dark", "Dark", ICONS.moon),
          option("system", "System", ICONS.monitor)
        ),
        h(
          "label",
          { class: "lt-language", title: "Language" },
          icon(ICONS.languages),
          h(
            "select",
            { "aria-label": "Language" },
            LOCALES.map(([code, name]) => h("option", { value: code, selected: code === locale }, name))
          ),
          icon(ICONS.chevronDown)
        )
      ),
      h(
        "div",
        { class: "lt-setting" },
        h("button", { type: "button", class: "lt-plus", "data-action": "config" }, icon(ICONS.sliders), "LinkedIn Plus"),
        h("button", { type: "button", class: "lt-plus", popovertarget: "lt-links" }, icon(ICONS.info), "Help & legal")
      ),
      h(
        "div",
        { id: "lt-links", popover: "" },
        h(
          "div",
          { class: "lt-links-groups" },
          FOOTER.map(([group2, links]) => h(
            "div",
            {},
            h("h3", {}, group2),
            links.map(([label, href]) => h("a", { href }, label))
          ))
        ),
        h("p", {}, `LinkedIn Corporation \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()}`)
      )
    );
    root.addEventListener("click", (e) => {
      const target = e.target;
      if (target.closest('[data-action="config"]')) return openConfig(onChange);
      const value = target.closest("[data-theme]")?.dataset.theme;
      if (value) {
        setTheme(value);
        onChange();
      }
    });
    root.addEventListener("change", (e) => {
      const select = e.target;
      setLocale(select.value).then(
        (ok) => ok || (select.value = locale),
        (error) => {
          console.warn("[LinkedIn Plus]", error);
          select.value = locale;
        }
      );
    });
    return root;
  }
  function refreshSettings() {
    const theme = themePreference();
    for (const option of document.querySelectorAll("#lt-settings [data-theme]")) {
      const checked = String(option.dataset.theme === theme);
      if (option.getAttribute("aria-checked") !== checked) option.setAttribute("aria-checked", checked);
    }
  }

  // src/sidebar.ts
  var PAGES2 = [
    // My Network's screen marker sits inside the main column (on Jobs it wraps the page). Its
    // empty "No pending invitations" card is hidden, so Invitations leads our card. The
    // invitation manager has no list of its own: it shows the one read last.
    {
      sidebar: '#workspace > div > div:has(> section [data-sdui-screen*=".mynetwork."]) > aside',
      first: [{ href: "https://www.linkedin.com/mynetwork/invitation-manager/received/", label: "Invitations", count: "" }],
      store: "lt-network-groups"
    },
    { sidebar: '[data-sdui-screen$=".jobs.JobsHome"] #workspace > div > div > aside' },
    // Notifications: a profile card and "Manage notifications" on the left (the right rail's ad
    // and footer go). Its screen marker sits inside the main column too.
    {
      sidebar: '#workspace > div > div:has(> section [data-sdui-screen*=".notifications."]) > aside:first-child',
      links: 'a[href*="/mypreferences/"]'
    }
  ];
  var ROW_ICONS = [
    ["/invitation-manager/", ICONS.userPlus],
    ["/connections/", ICONS.users],
    ["/people-follow/", ICONS.userCheck],
    ["/groups/", ICONS.messages],
    ["/events/", ICONS.calendar],
    ["/company/", ICONS.building],
    ["/newsletters/", ICONS.newspaper],
    ["/jobs/preferences/", ICONS.sliders],
    ["/jobs-tracker/", ICONS.bookmark],
    ["/job-posting", ICONS.pen],
    ["/mypreferences/", ICONS.settings]
  ];
  var text = (el) => el?.textContent?.trim() ?? "";
  function readGroups(own, page) {
    let groups = [...own.querySelectorAll("nav")].map((nav) => ({
      title: text(nav.parentElement?.querySelector(":scope > p")),
      rows: [...nav.querySelectorAll('a[href]:not(:has(svg[id*="premium"]))')].map((a) => ({
        href: a.href,
        label: text(a.querySelector(":scope > :nth-child(2)")),
        count: text(a.querySelector(":scope > :nth-child(3)"))
      }))
    }));
    const links = page.links ? [...own.querySelectorAll(page.links)] : [];
    groups.push({ title: "", rows: links.map((a) => ({ href: a.href, label: text(a), count: "" })) });
    groups = groups.filter((g) => g.rows.length);
    if (!page.store) return groups.length ? groups : null;
    if (groups.length) {
      localStorage.setItem(page.store, JSON.stringify(groups));
      return groups;
    }
    try {
      const stored = JSON.parse(localStorage.getItem(page.store) ?? "null");
      return Array.isArray(stored) && stored.length ? stored : null;
    } catch {
      return null;
    }
  }
  function renderSidebar(groups) {
    return h(
      "nav",
      { id: "lt-sidebar", class: "lt-card" },
      groups.map((g) => h(
        "div",
        { class: "lt-menu" },
        g.title && h("p", { class: "lt-menu-label" }, g.title),
        g.rows.map((r) => h(
          "a",
          { href: r.href, "aria-current": location.href.startsWith(r.href.replace(/\/received\/$/, "/")) ? "page" : null },
          icon(ROW_ICONS.find(([path]) => r.href.includes(path))?.[1] ?? ICONS.link),
          h("span", {}, r.label),
          r.count && h("strong", {}, r.count)
        ))
      ))
    );
  }
  function updateSidebar(onChange) {
    for (const page of PAGES2) {
      const own = document.querySelector(page.sidebar)?.firstElementChild;
      if (!own) continue;
      const groups = readGroups(own, page);
      if (groups && page.first) groups[0] = { ...groups[0], rows: [...page.first, ...groups[0].rows] };
      const card = sync("lt-sidebar", groups && { groups, path: location.pathname }, (d) => renderSidebar(d.groups), own);
      sync("lt-settings", true, () => renderSettings(onChange), card ?? own);
      refreshSettings();
      return;
    }
  }

  // src/jobs.ts
  var CARD = '[componentkey^="job-card-component-ref-"]';
  function markJobs() {
    if (!document.documentElement.lang.startsWith("en")) return;
    for (const p of document.querySelectorAll(`${CARD} p:not([data-lt-promoted])`)) {
      if (!p.children.length && p.textContent?.trim() === "Promoted") p.setAttribute("data-lt-promoted", "");
    }
  }

  // src/messaging.ts
  var text2 = (el) => el?.textContent?.trim() ?? "";
  function renderInboxes(d) {
    return h(
      "nav",
      { id: "lt-inboxes", "aria-label": d.title, title: d.title },
      d.inboxes.map((i) => h("a", { href: i.href }, i.logo ? h("img", { src: i.logo, alt: "" }) : icon(ICONS.building), h("span", {}, i.name)))
    );
  }
  function updateMessaging() {
    const filters = document.querySelector(".msg-conversations-container__title-row > :first-child");
    if (!filters) return;
    const links = [...document.querySelectorAll(".msg-premium-mailboxes-card__link")];
    const inboxes = links.map((a) => ({ href: a.href, name: text2(a), logo: a.querySelector("img")?.src }));
    const title = text2(links[0]?.closest("section")?.querySelector(".text-heading-medium"));
    sync("lt-inboxes", inboxes.length ? { title, inboxes } : null, renderInboxes, filters);
  }

  // src/picker.ts
  function installPickerGuard() {
    let lastMediaClick = 0;
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (e.isTrusted) {
        const control = target instanceof Element ? target.closest('button, [role="button"], a') : null;
        const isMedia = control?.matches('[data-action="media"]') || control?.querySelector("svg#image-outline-medium, svg#video-outline-medium");
        lastMediaClick = isMedia ? Date.now() : 0;
      } else if (target instanceof HTMLInputElement && target.type === "file" && Date.now() - lastMediaClick < 5e3 && !config().instantFilePicker) {
        e.preventDefault();
        lastMediaClick = 0;
        setTimeout(() => target.dispatchEvent(new Event("cancel", { bubbles: true })));
      }
    }, true);
  }

  // src/rail.ts
  var STATS = [
    ["/me/profile-views/", ICONS.eye],
    ["/analytics/creator/content/", ICONS.chart]
  ];
  var SHORTCUTS = [
    ["Dashboard", "https://www.linkedin.com/dashboard/", ICONS.dashboard],
    ["Saved posts", "https://www.linkedin.com/my-items/saved-posts/", ICONS.bookmark],
    ["Settings", "https://www.linkedin.com/mypreferences/d/", ICONS.settings]
  ];
  var text3 = (el) => el?.textContent?.trim() ?? "";
  function readProfile(identity) {
    const [media, info, company] = identity.querySelectorAll("a");
    if (!info) return null;
    const rail = identity.closest("aside");
    const ours = ":not(#lt-profile a)";
    const imgs = media ? [...media.querySelectorAll("img")] : [];
    const [name = "", headline = "", location2 = ""] = [...info.querySelectorAll("p")].map(text3);
    const stats = STATS.flatMap(([path, svg]) => {
      const a = rail?.querySelector(`a[href*="${path}"]${ours}`);
      const m = a?.getAttribute("aria-label")?.match(/^(.*?)\s+\(?([\d\s.,]+)\)?$/);
      return a && m?.[1] && m[2] ? [{ href: a.href, label: m[1], value: m[2], svg }] : [];
    });
    const pages = /* @__PURE__ */ new Map();
    for (const a of rail?.querySelectorAll(`a[href*="/company/"]${ours}`) ?? []) {
      pages.set(a.pathname, { href: a.href, name: text3(a), logo: a.querySelector("img")?.src });
    }
    return {
      href: info.href,
      name,
      headline,
      location: location2,
      avatar: imgs.find((i) => i.alt)?.src,
      cover: imgs.find((i) => !i.alt)?.src,
      verified: !!info.querySelector('svg[role="img"]'),
      company: company && { name: text3(company), logo: company.querySelector("img")?.src },
      stats,
      pages: [...pages.values()]
    };
  }
  function row(href, glyph, label, value) {
    return h("a", { href }, glyph, h("span", {}, label), value != null && h("strong", {}, value));
  }
  function personHead(p, extra = {}) {
    return [
      h("a", { class: "lt-cover", href: p.href, tabindex: "-1", "aria-hidden": "true", style: p.cover && `background-image:url("${p.cover}")` }),
      h("a", { class: "lt-avatar", href: p.href, tabindex: "-1", "aria-hidden": "true" }, p.avatar && h("img", { src: p.avatar, alt: "" })),
      h(
        "div",
        { class: "lt-body" },
        h("div", { class: "lt-name-row" }, h("a", { class: "lt-name", href: p.href }, p.name, p.verified && icon(ICONS.verified)), extra.badges),
        h("p", { class: "lt-headline" }, p.headline),
        h(
          "p",
          { class: "lt-meta" },
          p.location && h("span", {}, p.location),
          p.company && h("span", { class: "lt-company" }, p.company.logo && h("img", { src: p.company.logo, alt: "" }), p.company.name),
          extra.meta
        )
      )
    ];
  }
  function renderProfile(p) {
    return h(
      "section",
      { id: "lt-profile", class: "lt-card" },
      personHead(p),
      h(
        "nav",
        { class: "lt-menu", "aria-label": "Your activity" },
        p.stats.map((s) => row(s.href, icon(s.svg), s.label, s.value)),
        SHORTCUTS.map(([label, href, svg]) => row(href, icon(svg), label))
      ),
      p.pages.length > 0 && h(
        "nav",
        { class: "lt-menu", "aria-label": "Your pages" },
        h("p", { class: "lt-menu-label" }, "Pages"),
        p.pages.map((pg) => row(pg.href, pg.logo && h("img", { src: pg.logo, alt: "" }), pg.name))
      )
    );
  }
  var knownGames = /* @__PURE__ */ new Map();
  var expanded = false;
  var tries = 0;
  var retry;
  function readGames() {
    const card = document.querySelector('[componentkey="feedRightNavGamesComponentRef"]');
    const links = [...card?.querySelectorAll('a[href*="/games/"]') ?? []];
    if (links.length > 4) expanded = true;
    const button = card?.querySelector("button");
    if (!expanded && button && retry === void 0 && tries < 10) {
      tries++;
      button.click();
      retry = window.setTimeout(() => {
        retry = void 0;
        readGames();
      }, 1e3);
    }
    for (const a of links) {
      knownGames.set(a.href, {
        href: a.href,
        name: text3(a.querySelector("strong")),
        icon: a.querySelector("img")?.src,
        // "Zip #619" ("Zip № 619" in some languages) sits next to "4 connections played", so
        // read the title line only.
        number: text3(a.querySelector("strong")?.parentElement).match(/(\d+)$/)?.[1]
      });
    }
    return knownGames.size ? [...knownGames.values()] : null;
  }
  function renderGames(games) {
    return h(
      "nav",
      { id: "lt-games", class: "lt-card", "aria-label": "Today\u2019s puzzles" },
      games.map((g) => h("a", { href: g.href, title: `${g.name} #${g.number}` }, h("img", { src: g.icon, alt: g.name }), h("span", {}, g.number)))
    );
  }

  // src/profile.ts
  var PROFILE = '[data-sdui-screen$=".profile.Profile"]';
  var STATS2 = [
    ["/analytics/profile-views/", ICONS.eye],
    ["/analytics/creator/content/", ICONS.chart],
    ["/analytics/search-appearances/", ICONS.search]
  ];
  var text4 = (el) => el?.textContent?.trim() ?? "";
  function readStats(main) {
    const card = main.querySelector('section:has(a[href*="/analytics/search-appearances/"]):not(:has(section a[href*="/analytics/"]))');
    const stats = STATS2.flatMap(([path, svg]) => {
      const a = card?.querySelector(`a[href*="${path}"]`);
      const m = text4(a?.querySelector("p")).match(/^([\d\s.,]+?)\s+(.+)$/);
      return a && m?.[1] && m[2] ? [{ href: a.href, value: m[1], label: m[2].charAt(0).toUpperCase() + m[2].slice(1), svg }] : [];
    });
    return { title: text4(card?.querySelector("h2")), stats };
  }
  function readSettings(aside) {
    const card = aside.querySelector('[componentkey$="SupportedLocales"]');
    const values = [...card?.querySelectorAll("p") ?? []].map(text4);
    return [...card?.querySelectorAll("h2") ?? []].flatMap((h2, i) => {
      const a = h2.parentElement?.querySelector("a[href]");
      return a ? [{ href: a.href, label: text4(h2), value: (values[i] ?? "").replace(/^www\./, ""), svg: i ? ICONS.link : ICONS.languages }] : [];
    });
  }
  function readDashboard(main, aside) {
    const d = { ...readStats(main), settings: readSettings(aside) };
    return d.stats.length || d.settings.length ? d : null;
  }
  function renderDashboard(d) {
    return h(
      "nav",
      { id: "lt-dashboard", class: "lt-card", "aria-label": d.title },
      d.stats.length > 0 && h(
        "div",
        { class: "lt-menu" },
        d.title && h("p", { class: "lt-menu-label" }, d.title),
        d.stats.map((r) => h("a", { href: r.href }, icon(r.svg), h("span", {}, r.label), h("strong", {}, r.value)))
      ),
      d.settings.length > 0 && h(
        "div",
        { class: "lt-menu" },
        d.settings.map((r) => h("a", { href: r.href }, icon(r.svg), h("span", { class: "lt-stack" }, r.label, h("small", {}, r.value))))
      )
    );
  }
  function readPerson(page) {
    const top = page.querySelector('[componentkey$="Topcard"]');
    const h2 = top?.querySelector("h2");
    if (!top || !h2) return null;
    let info = h2.parentElement;
    while (info && info !== top && !info.querySelector('a[href*="/overlay/contact-info/"]')) info = info.parentElement;
    const link = h2.closest("a");
    const avatar = top.querySelector('[componentkey="topcard-logo-image-referencekey"] img')?.src;
    const cover = top.querySelector("figure img")?.src;
    return {
      href: link?.href ?? location.href,
      name: text4(h2),
      headline: text4(info?.querySelector(":scope > p")),
      location: text4(info?.querySelector(':scope > div:has(a[href*="/overlay/contact-info/"]) > p')),
      avatar,
      cover: cover === avatar ? void 0 : cover,
      verified: !!link?.querySelector("svg")
    };
  }
  var moreButton = (page) => [...page.querySelectorAll('[componentkey$="Topcard"] button:has(svg#ellipses-horizontal-fill-small)')].find((b) => b.getClientRects().length);
  function topActions(page) {
    const row2 = moreButton(page)?.parentElement?.parentElement;
    return [...row2?.querySelectorAll("[data-display-contents] > :is(a, button)") ?? []].filter((el) => !isOwn(page) || el.hasAttribute("aria-expanded"));
  }
  var isOwn = (page) => !!page.querySelector('button[componentkey$="_openToButton"]');
  var menu;
  var probing = false;
  var rerender = () => {
  };
  var openPopovers = () => [...document.querySelectorAll("[popover]:popover-open")];
  async function openMenu(trigger, unseen) {
    const before = new Set(openPopovers());
    document.documentElement.toggleAttribute("data-lt-ghost", unseen);
    trigger.click();
    return until(() => openPopovers().find((p) => !before.has(p)), 1e3).catch(() => void 0);
  }
  async function closeMenu(more, m) {
    const open = () => m?.isConnected && m.matches(":popover-open");
    if (open()) more.click();
    await until(() => !open(), 500).catch(() => void 0);
    document.documentElement.removeAttribute("data-lt-ghost");
  }
  var menuItems = (m) => [...m?.querySelectorAll('[role="menuitem"]') ?? []];
  async function probeMenu(page) {
    const more = moreButton(page);
    const path = location.pathname;
    if (!more || probing || menu?.path === path || isOwn(page)) return;
    probing = true;
    const focused = document.activeElement;
    const m = await openMenu(more, true);
    const items = menuItems(m).map((el) => ({ label: text4(el), icon: el.querySelector("svg[id]")?.id ?? "" }));
    await closeMenu(more, m);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
    menu = { path, items };
    probing = false;
    rerender();
  }
  var KINDS = [
    ["person-plus", ICONS.userPlus, true],
    // Connect
    ["plus", ICONS.plus, true],
    // Follow
    ["check", ICONS.userCheck, true],
    // Following
    ["paper-plane", ICONS.send, false],
    // Message
    ["ellipses-horizontal", ICONS.ellipsis, true]
  ];
  var kind = (id) => {
    const i = KINDS.findIndex(([prefix]) => id.startsWith(prefix));
    const [, svg, iconOnly] = KINDS[i] ?? [];
    return { rank: i < 0 ? KINDS.length - 1.5 : i, svg, iconOnly: !!iconOnly };
  };
  var isConnect = (id) => id.startsWith("person-plus");
  var isFollow = (id) => /^(plus|check)-/.test(id);
  var TOP = '[componentkey$="Topcard"]';
  var contactLink = (page) => page.querySelector(`${TOP} a[href*="/overlay/contact-info/"]`);
  var bellLink = (page) => page.querySelector(`${TOP} a:has(svg[id^="bell-"])`);
  var MUTUAL = `${TOP} a[href*="/search/results/people/"]:has(img, svg)`;
  var topOrgs = (page) => [...page.querySelectorAll('[componentkey$="Topcard"] [role="button"]:has(figure svg:is([id^="company-"], [id^="school-"]))')].filter((el) => el.getClientRects().length);
  function readMini(page) {
    const person = readPerson(page);
    if (!person) return null;
    const stats = [...page.querySelectorAll(`${TOP} p:not(${MUTUAL} p)`)].flatMap((p) => {
      const m = text4(p).match(/^(\d[\d\s.,]*\+?)(?:\s+(\S.*))?$/);
      const label = m?.[2] ?? text4(p.nextElementSibling);
      return m?.[1] && label ? [{ value: m[1], label, href: p.closest("a")?.href }] : [];
    });
    const orgs = topOrgs(page).map((el) => {
      const section = el.querySelector('figure svg[id^="school-"]') ? "Education" : "Experience";
      const heading = text4(page.querySelector(`[componentkey$="${section}TopLevelSection"] h2`)).replace(/\s*\(\d+\)$/, "");
      return { label: heading || section, name: text4(el), logo: el.querySelector("img")?.src };
    });
    const links = [];
    const actions = [];
    topActions(page).forEach((el, index) => {
      const label = text4(el) || (el.getAttribute("aria-label") ?? "");
      const icon2 = el.querySelector("svg[id]")?.id ?? "";
      if (el instanceof HTMLAnchorElement && !icon2) {
        const url = new URL(el.href).searchParams.get("url");
        links.push({ href: el.href, label: url ? label : "", name: url ? url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : label });
      } else actions.push({ label, icon: icon2, from: "card", index });
    });
    if (menu?.path === location.pathname) {
      menu.items.forEach(({ label, icon: icon2 }, index) => {
        const wanted = isConnect(icon2) ? isConnect : isFollow(icon2) ? isFollow : void 0;
        if (wanted && !actions.some((a) => wanted(a.icon))) actions.push({ label, icon: icon2, from: "menu", index });
      });
    }
    actions.sort((a, b) => kind(a.icon).rank - kind(b.icon).rank);
    const h2 = page.querySelector(`${TOP} h2`);
    const info = contactLink(page)?.closest(`${TOP} :has(h2)`);
    const row2 = [...info?.children ?? []].find((c) => h2 && c.contains(h2));
    const beside = [...row2?.querySelectorAll(":scope > p") ?? []].map(text4);
    const degree = beside.find((t) => t.startsWith("\xB7"))?.replace(/^·\s*/, "") ?? "";
    const pronouns = beside.find((t) => t && !t.startsWith("\xB7")) ?? "";
    const mutual = page.querySelector(MUTUAL);
    return {
      ...person,
      degree,
      pronouns,
      influencer: !!page.querySelector(`${TOP} svg[id^="influencer-"]`),
      contact: text4(contactLink(page)),
      bell: bellLink(page)?.getAttribute("aria-label") ?? "",
      mutual: mutual ? { text: text4(mutual), href: mutual.href, faces: [...mutual.querySelectorAll("img")].slice(0, 3).map((i) => i.src) } : void 0,
      stats,
      orgs,
      links,
      actions
    };
  }
  function renderMini(m) {
    const primary = m.actions.find((a) => isConnect(a.icon)) ?? m.actions.find((a) => !kind(a.icon).iconOnly);
    const card = h(
      "section",
      { id: "lt-mini", class: "lt-card" },
      m.bell && h("button", { type: "button", class: "lt-bell", "data-real": "bell", title: m.bell, "aria-label": m.bell }, icon(ICONS.bell)),
      personHead(m, {
        badges: [
          m.influencer && h("span", { class: "lt-influencer", title: "LinkedIn Influencer" }, icon(ICONS.award)),
          m.degree && h("span", { class: "lt-degree" }, m.degree),
          m.pronouns && h("span", { class: "lt-pronouns" }, m.pronouns)
        ],
        meta: m.contact && h("button", { type: "button", class: "lt-contact", "data-real": "contact" }, m.contact)
      }),
      m.stats.length > 0 && h(
        "p",
        { class: "lt-mini-stats" },
        m.stats.map((st) => h(st.href ? "a" : "span", { href: st.href }, h("strong", {}, st.value), ` ${st.label}`))
      ),
      m.mutual && h(
        "a",
        { class: "lt-mini-mutual", href: m.mutual.href },
        m.mutual.faces.length > 0 && h("span", { class: "lt-faces" }, m.mutual.faces.map((src) => h("img", { src, alt: "" }))),
        h("span", {}, m.mutual.text)
      ),
      m.orgs.length + m.links.length > 0 && h(
        "div",
        { class: "lt-mini-rows" },
        m.orgs.map((o, i) => h(
          "button",
          { type: "button", "data-org": i },
          h("span", { class: "lt-logo" }, o.logo ? h("img", { src: o.logo, alt: "" }) : icon(ICONS.building)),
          h("span", { class: "lt-stack" }, h("small", {}, o.label), h("span", {}, o.name))
        )),
        m.links.map((l) => h(
          "a",
          { href: l.href, target: "_blank", rel: "noopener" },
          h("span", { class: "lt-logo" }, icon(ICONS.link)),
          h("span", { class: "lt-stack" }, l.label && h("small", {}, l.label), h("span", {}, l.name))
        ))
      ),
      m.actions.length > 0 && h(
        "div",
        { class: "lt-mini-actions" },
        m.actions.map((a, i) => {
          const { svg, iconOnly } = kind(a.icon);
          const classes = [iconOnly && "lt-icon-button", svg === ICONS.ellipsis && "lt-more-button", a === primary && "lt-primary"];
          return h(
            "button",
            { type: "button", "data-index": i, class: classes.filter(Boolean).join(" ") || null, title: iconOnly ? a.label : null, "aria-label": iconOnly ? a.label : null },
            svg && icon(svg),
            !iconOnly && a.label
          );
        })
      )
    );
    card.addEventListener("click", (e) => {
      const target = e.target;
      const fake = target.closest("[data-index]");
      const org = target.closest("[data-org]");
      const real = target.closest("[data-real]")?.dataset.real;
      const page = document.querySelector(PROFILE);
      const action = fake && m.actions[Number(fake.dataset.index)];
      if (!page) return;
      if (fake && action) void press(page, action, fake);
      if (org) void fromTop(() => topOrgs(page)[Number(org.dataset.org)]).then((el) => el?.click());
      if (real) void fromTop(() => (real === "bell" ? bellLink : contactLink)(page)).then((el) => el?.click());
    });
    return card;
  }
  var seen = /* @__PURE__ */ new Map();
  async function fromTop(find) {
    const found = find();
    if (found) return found;
    document.querySelector("#workspace")?.scrollTo({ top: 0 });
    return until(find, 3e3).catch(() => void 0);
  }
  async function press(page, action, fake) {
    const more = await fromTop(() => moreButton(page));
    let m;
    if (action.from === "menu") {
      if (!more) return;
      m = await openMenu(more, true);
      const item = menuItems(m)[action.index];
      if (item && item.querySelector("svg[id]")?.id === action.icon) {
        item.click();
        await closeMenu(more, m);
        if (isFollow(action.icon)) setTimeout(() => {
          menu = void 0;
          rerender();
        }, 1500);
        return;
      }
      document.documentElement.removeAttribute("data-lt-ghost");
    } else {
      const real = topActions(page)[action.index];
      if (real) m = await openMenu(real, false);
    }
    if (!m) return;
    for (const b of fake.parentElement?.children ?? []) b.style.removeProperty("anchor-name");
    fake.style.setProperty("anchor-name", "--lt-pressed");
    m.setAttribute("data-lt-pinned", "");
    const unpin = (e) => {
      if (e.newState !== "closed") return;
      m.removeAttribute("data-lt-pinned");
      m.removeEventListener("toggle", unpin);
    };
    m.addEventListener("toggle", unpin);
  }
  var CONTACT_VALUE = '[data-sdui-screen$=".ProfileContactDetailsOverlay"] svg[id] + div > p:not(:first-child)';
  document.addEventListener("click", (e) => {
    const value = e.target.closest?.(CONTACT_VALUE);
    if (!value || !config().blurContacts || value.hasAttribute("data-lt-revealed")) return;
    e.preventDefault();
    e.stopPropagation();
    value.setAttribute("data-lt-revealed", "");
  }, true);
  var allLanguages = /* @__PURE__ */ new Map();
  function readLanguages(card, rows) {
    const more = [...card.querySelectorAll('a[href$="/details/languages/"]')].find((a) => text4(a));
    const all = config().allLanguages;
    const footer = more?.parentElement?.parentElement;
    if (footer) footer.style.display = all ? "none" : "";
    const shown = rows.map((row2) => [...row2.querySelectorAll("p")].slice(0, 2).map(text4));
    if (!more || !all) return shown;
    const url = more.href;
    if (!allLanguages.has(url)) {
      allLanguages.set(url, null);
      fetch(url, { credentials: "include" }).then((r) => r.text()).then((html) => {
        const unescape = (s) => s.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"' })[e] ?? "'");
        allLanguages.set(url, html.split('componentkey="entity-collection-item').slice(1).map((row2) => [...row2.slice(0, 3e3).matchAll(/<p[^>]*>([^<]*)<\/p>/g)].slice(0, 2).map((m) => unescape(m[1].trim()))));
        rerender();
      }).catch(() => void 0);
    }
    return allLanguages.get(url) ?? shown;
  }
  function renderLanguages(languages) {
    return h("dl", { id: "lt-languages" }, languages.map(([name, level]) => [h("dt", {}, name), h("dd", {}, level)]));
  }
  function syncLanguages(page) {
    const card = page.querySelector('[componentkey*="LanguageTopLevel"]');
    const rows = [...card?.querySelectorAll('[componentkey^="entity-collection-item"]') ?? []];
    const last = rows[rows.length - 1];
    if (card && last) sync("lt-languages", readLanguages(card, rows), renderLanguages, last);
  }
  function updateProfile(onChange) {
    const page = document.querySelector(PROFILE);
    const main = page?.querySelector("#workspace section");
    const aside = page?.querySelector("#workspace aside");
    document.documentElement.toggleAttribute("data-lt-hide-suggestions", config().hideProfileSuggestions);
    document.documentElement.toggleAttribute("data-lt-blur-contacts", config().blurContacts);
    if (!page || !main || !aside?.firstElementChild) return;
    rerender = onChange;
    void probeMenu(page);
    syncLanguages(page);
    const last = seen.get(location.pathname) ?? {};
    const miniData = readMini(page) ?? last.mini;
    const read = readDashboard(main, aside);
    const dashboardData = read && !read.stats.length && last.dashboard?.stats.length ? { ...read, title: last.dashboard.title, stats: last.dashboard.stats } : read ?? last.dashboard;
    seen.set(location.pathname, { mini: miniData ?? void 0, dashboard: dashboardData ?? void 0 });
    const mini = sync("lt-mini", miniData, renderMini, aside.firstElementChild);
    document.documentElement.toggleAttribute("data-lt-mini-only", !!mini && !isOwn(page));
    const dashboard = sync("lt-dashboard", dashboardData, renderDashboard, mini ?? aside.firstElementChild);
    sync("lt-settings", true, () => renderSettings(onChange), dashboard ?? mini ?? aside.firstElementChild);
    refreshSettings();
  }

  // src/styles.css
  var styles_default = `/* Colours are LinkedIn's own (its light and dark palette values), so our pieces match the
   page; only typography and spacing follow shadcn. light-dark() resolves against
   LinkedIn's color-scheme, so everything follows its light/dark setting. */
:root, [data-color-scheme] {
  --lt-bg: light-dark(#f4f2ee, #000000);
  --lt-card: light-dark(#ffffff, #1b1f23);
  --lt-fg: light-dark(rgb(0 0 0 / 0.9), rgb(255 255 255 / 0.9));
  --lt-muted: light-dark(rgb(0 0 0 / 0.08), rgb(255 255 255 / 0.08));
  --lt-muted-fg: light-dark(rgb(0 0 0 / 0.6), rgb(255 255 255 / 0.6));
  --lt-border: light-dark(rgb(140 140 140 / 0.2), rgb(140 140 140 / 0.25));
  --lt-primary: light-dark(#0a66c2, #71b7fb);
  --lt-premium: light-dark(#a86200, #e7a33e);
  --lt-radius: 12px;
  --lt-font: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
}

/* The theme toggle sets body[data-color-scheme]. A page that loaded dark also has a hashed
   dark-scheme class on <body> that wins over the attribute, so Light never applied until a
   reload. Let the attribute decide (unlayered, so it beats LinkedIn's layers). */
body[data-color-scheme="light"] { color-scheme: light; }
body[data-color-scheme="dark"] { color-scheme: dark; }
/* Ember pages (messaging) mark dark mode with a class only; our colours need the scheme. */
html.theme--mercado-dark { color-scheme: dark; }

/* One text size. LinkedIn's CSS is all inside @layer, so these unlayered,
   zero-specificity rules still beat it while anything below can override them. */
:where(#workspace) :where(:not(svg, svg *)) {
  font-family: var(--lt-font);
  font-size: 14px;
  line-height: 20px;
}

/* Feed (both the "For you" and "Network" tabs; the tab bar is the shared marker):
   two columns at 25/75. The right rail goes; profile and games move left. */
#workspace div:has(> section [componentkey="feed-tab-host_tab-bar"]) {
  grid-template-columns: 25fr 75fr;
  column-gap: 24px;
}
#workspace div:has(> section [componentkey="feed-tab-host_tab-bar"]) > aside:first-child { grid-column: 1; }
#workspace div:has(> section [componentkey="feed-tab-host_tab-bar"]) > section { grid-column: 2; }
#workspace div:has(> section [componentkey="feed-tab-host_tab-bar"]) > aside:last-child { display: none !important; }

/* Profile, My Network, Jobs and Notifications: the same two columns, with LinkedIn's sidebar (the profile's right
   rail) on the left. Its own content is hidden: what's worth keeping is in our cards
   (profile.ts, sidebar.ts), and the footer's links are in Help & legal. */
:is(:is([data-sdui-screen$=".profile.Profile"], [data-sdui-screen$=".jobs.JobsHome"]) #workspace > div > div, #workspace > div > div:has(> section :is([data-sdui-screen*=".mynetwork."], [data-sdui-screen*=".notifications."]))):has(> section):has(> aside) {
  grid-template-columns: 25fr 75fr;
  column-gap: 24px;
  & > aside { grid-column: 1; grid-row: 1; display: grid; align-content: start; gap: 8px; position: sticky; top: 24px; align-self: start; }
  & > section { grid-column: 2; grid-row: 1; }
  /* A second sidebar on the right (Notifications: an ad and the footer) goes too. */
  & > footer, & > aside > div:first-child, & > aside:first-child ~ aside { display: none !important; }
  & :is(#lt-dashboard, #lt-sidebar) { margin: 0; }
}
/* My Network: its Premium upsells ("People who viewed your profile", "People interested in
   services like yours", whose links go to Premium's sales page), its puzzles, and "No
   pending invitations" (an empty list): Invitations is in our sidebar (sidebar.ts). */
[data-sdui-screen*=".mynetwork."] section:is(:has(a[href*="/premium/products/"]), :has(a[href*="/games/"])),
[data-sdui-screen*=".mynetwork."] section[componentkey="pending-invitations-preview"]:not(:has([role="list"] > :not(hr))) { display: none !important; }
/* Grow / Catch up: the feed's underline tabs. */
#workspace section:has(> div > div > nav a[href*="/mynetwork/grow/"]) {
  padding: 0 !important; border-radius: 0; background: none; box-shadow: none; border-bottom: 1px solid var(--lt-border);
  & nav { flex: 1; }
  & ul { width: 100%; }
  & li { display: flex; flex: 1; }
  & a { flex: 1; justify-content: center; }
}
#lt-sidebar .lt-menu a[aria-current="page"] { background: var(--lt-muted); font-weight: 600; }
/* The bar LinkedIn slides in once the top card scrolls away: our mini profile in the
   sidebar does its job (profile.ts). */
[data-sdui-screen$=".profile.Profile"] [role="toolbar"] { display: none; }
/* Someone else's profile: the mini profile replaces LinkedIn's top card. The card stays in the
   page, unseen, for the mini profile's buttons to click (profile.ts), and at full width so
   LinkedIn keeps its wide layout. Its menus and dialogs still show. */
html[data-lt-mini-only] [data-sdui-screen$=".profile.Profile"] [componentkey$="Topcard"] {
  position: absolute !important; inset: 0 0 auto; visibility: hidden; pointer-events: none;
  & :is([popover], dialog) { visibility: visible; pointer-events: auto; }
}
/* Someone else's profile starts with About. Yours keeps LinkedIn's order. */
html[data-lt-mini-only] [data-sdui-screen$=".profile.Profile"] #workspace section [componentkey$="About"] { order: -1; }
/* Activity goes after Languages, before Interests: it's the cards in front of Interests' slot
   and the ones after it that need moving. The slots are display: contents wrappers, so the
   order goes on the cards inside them. */
[data-sdui-screen$=".profile.Profile"] #workspace section > div > div {
  & [componentkey$="Activity"] { order: 1; }
  & [componentkey*="CardsBelowActivityPart"]:has([componentkey$="_Interests"]),
  & > :has([componentkey$="_Interests"]) ~ * > * { order: 2; }
}
/* Languages as one compact list (profile.ts) instead of LinkedIn's tall rows. */
[componentkey*="LanguageTopLevel"]:has(#lt-languages) [componentkey^="entity-collection-item"] { display: none; }
#lt-languages {
  display: grid; grid-template-columns: max-content 1fr; gap: 6px 24px; margin: 4px 0 20px; font-size: 14px; line-height: 20px;
  & dt { color: var(--lt-fg); font-weight: 600; }
  & dd { margin: 0; color: var(--lt-muted-fg); }
}
/* Jobs home: the Hiring Pro upsell ("hire top talent without the busywork"). Job search:
   the Premium row in the results ("See jobs where you're a top applicant"). */
[componentkey$="HomeFeedModuleListLazyColumnContainer"] > :has(a[href*="/job-posting/"]),
[componentkey="SearchResultsMainContent"] > :has(a[href*="/premium/products/"]) { display: none !important; }
/* Job search: promoted listings (jobs.ts) get an amber edge and their word as a badge. */
[componentkey^="job-card-component-ref-"]:has([data-lt-promoted]) { box-shadow: inset 3px 0 0 var(--lt-premium); }
[data-lt-promoted] { padding: 0 6px; border-radius: 9999px; background: color-mix(in srgb, var(--lt-premium) 15%, transparent); color: var(--lt-premium); font-weight: 600; }
/* A dismissed job collapses to its title and company, faded, with LinkedIn's Undo
   (its \xD7 turns into an arrow). */
[componentkey^="job-card-component-ref-"]:has(button svg#arrow-curve-left-outline-small) {
  & figure, & div:has(> p > span) ~ p, & div:has(p > span) ~ p { display: none !important; }
  & [role="button"] { opacity: 0.6; }
  & [role="button"] * { padding-block: 0 !important; min-height: 0 !important; }
}
/* Sales Insights, while it's an upsell: its links go to Premium's sales page. With Premium
   it's the real thing and stays. */
[data-sdui-screen$=".profile.Profile"] [componentkey$="SalesInsightsOrHighlights"]:has(a[href*="/premium/products/"]) { display: none !important; }
/* Contact info's values, blurred until clicked (profile.ts). */
html[data-lt-blur-contacts] [data-sdui-screen$=".ProfileContactDetailsOverlay"] svg[id] + div > p:not(:first-child):not([data-lt-revealed]) {
  filter: blur(5px); cursor: pointer; user-select: none;
}
#lt-mini { position: relative; margin: 0; }
#lt-mini .lt-bell {
  position: absolute; top: 8px; right: 8px; z-index: 1; display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 9999px;
  background: rgb(0 0 0 / 0.45); color: #fff; backdrop-filter: blur(6px); cursor: pointer;
  &:hover { background: rgb(0 0 0 / 0.6); }
  & svg { width: 15px; height: 15px; }
}
#lt-mini .lt-degree { padding: 0 7px; border-radius: 9999px; background: color-mix(in srgb, var(--lt-premium) 15%, transparent); color: var(--lt-premium); font-size: 12px; font-weight: 600; line-height: 20px; }
#lt-mini .lt-influencer { display: grid; color: var(--lt-premium); }
#lt-mini .lt-influencer svg { width: 16px; height: 16px; }
#lt-mini .lt-pronouns { color: var(--lt-muted-fg); font-size: 13px; }
#lt-mini .lt-contact {
  padding: 0; border: 0; background: none; color: var(--lt-primary); font: inherit; font-weight: 600; cursor: pointer;
  &:hover { text-decoration: underline; }
}
#lt-mini .lt-mini-mutual {
  display: flex; align-items: center; gap: 8px; margin: -4px 16px 12px; color: var(--lt-muted-fg); font-size: 13px; line-height: 16px;
  &:hover { background: none; }
  &:hover > span:last-child { text-decoration: underline; }
}
#lt-mini .lt-faces { display: flex; flex: none; }
#lt-mini .lt-faces img { width: 22px; height: 22px; border: 2px solid var(--lt-card); border-radius: 9999px; object-fit: cover; }
#lt-mini .lt-faces img + img { margin-left: -8px; }
#lt-mini .lt-mini-stats { display: flex; flex-wrap: wrap; gap: 4px 12px; margin: -4px 16px 12px; color: var(--lt-muted-fg); }
#lt-mini .lt-mini-stats strong { color: var(--lt-fg); font-weight: 600; }
#lt-mini .lt-mini-stats a:hover { background: none; text-decoration: underline; }
/* Companies, school and website, one per row. */
#lt-mini .lt-mini-rows { display: grid; gap: 2px; margin: -4px 8px 12px; }
#lt-mini .lt-mini-rows :is(button, a) {
  display: flex; align-items: center; gap: 10px; min-width: 0; padding: 6px 8px; border: 0; border-radius: 8px;
  background: none; color: var(--lt-fg); font: inherit; font-size: 13px; line-height: 16px; text-align: start; cursor: pointer;
  &:hover { background: var(--lt-muted); }
  &:focus-visible { outline: 2px solid var(--lt-muted-fg); outline-offset: -2px; }
  & .lt-logo { display: grid; flex: none; place-items: center; width: 24px; height: 24px; overflow: hidden; border-radius: 6px; background: var(--lt-muted); box-shadow: inset 0 0 0 1px var(--lt-border); color: var(--lt-muted-fg); }
  & img { display: block; width: 100%; height: 100%; object-fit: cover; }
  & .lt-logo svg { width: 14px; height: 14px; }
  & .lt-stack { display: grid; min-width: 0; }
  & .lt-stack > * { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  & small { color: var(--lt-muted-fg); font-size: 11px; line-height: 14px; }
  & .lt-stack > span { font-weight: 500; }
}
#lt-mini .lt-mini-actions { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px 16px; }
#lt-mini .lt-mini-actions button {
  display: inline-flex; flex: 1 0 auto; justify-content: center; align-items: center; gap: 6px; height: 32px; padding: 0 14px; border: 1px solid var(--lt-primary); border-radius: 9999px;
  background: none; color: var(--lt-primary); font: inherit; font-weight: 600; cursor: pointer;
  &.lt-primary { background: var(--lt-primary); color: var(--lt-card); }
  &:hover { box-shadow: inset 0 0 0 1px var(--lt-primary); }
  /* Connect, Follow, Following and \u22EF: icons, named in their tooltip. */
  &.lt-icon-button { display: grid; flex: none; place-items: center; width: 32px; padding: 0; }
  &.lt-more-button { border-color: var(--lt-border); color: var(--lt-muted-fg); }
  &:focus-visible { outline: 2px solid var(--lt-muted-fg); outline-offset: 2px; }
  & svg { width: 16px; height: 16px; }
}
/* The \u22EF menu while the mini profile reads it or picks Connect or Follow from it (profile.ts). */
html[data-lt-ghost] [popover]:popover-open { visibility: hidden !important; }
/* A menu opened from the mini profile, pinned under its button instead of the real one. */
[popover][data-lt-pinned] {
  position-anchor: --lt-pressed;
  position-try-fallbacks: flip-block;
  top: calc(anchor(bottom) + 4px) !important;
  left: anchor(left) !important;
  transform: none !important;
  translate: none !important;
  margin: 0 !important;
}
html[data-lt-hide-suggestions] :is([componentkey$="SuggestedForYou"], [componentkey*="ProfilePostConnectDrawer"]) { display: none !important; }
/* Your dashboard moves to the sidebar. */
[data-sdui-screen$=".profile.Profile"] #workspace section [data-testid="lazy-column"] section:has(a[href*="/analytics/search-appearances/"]):not(:has(section a[href*="/analytics/"])) { display: none; }

/* Left rail: only our profile card and games row. */
aside :has(> #feedIdentityModuleComponentRef) > :not(#lt-profile, #lt-games, #lt-settings) { display: none !important; }

/* Feed tabs (For you / Network): underline tabs across the feed, under our composer.
   The white card is on an inner wrapper; the tabs keep LinkedIn's own hover. */
[componentkey="feed-tab-host_tab-bar"] { padding: 0; border-radius: 0; background: none; box-shadow: none; border-bottom: 1px solid var(--lt-border); }
[componentkey="feed-tab-host_tab-bar"] :not([role="button"], [role="button"] *) { background: none; }
[componentkey="feed-tab-host_tab-bar"] div:has([role="button"]):not([role="button"] *) { width: 100%; }
[componentkey="feed-tab-host_tab-bar"] [role="button"] { flex: 1; }
[componentkey="feed-tab-host_tab-bar"] [role="button"] > div:last-child { justify-content: center; }
/* Locked while the docked composer is open (see placeCompose): a lock and the reason
   after the label. The label's wrapper is a column, so they go inside the <p>. */
[componentkey="feed-tab-host_tab-bar"] [data-lt-locked] { cursor: not-allowed; }
[componentkey="feed-tab-host_tab-bar"] [data-lt-locked] p { display: flex; justify-content: center; align-items: center; gap: 6px; color: var(--lt-muted-fg); }
[componentkey="feed-tab-host_tab-bar"] [data-lt-locked] p::before {
  content: ""; order: 1; width: 14px; height: 14px; background: currentColor;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='11' x='3' y='11' rx='2'/%3E%3Cpath d='M7 11V7a5 5 0 0 1 10 0v4'/%3E%3C/svg%3E") center / 14px no-repeat;
}
[componentkey="feed-tab-host_tab-bar"] [data-lt-locked] p::after { content: "while you write"; order: 2; font-size: 12px; font-weight: 400; }

/* Feed junk */
[data-testid="mainFeed"] > :has([componentkey^="Launchpad"]) { display: none !important; }

/* Feed posts. A post is a fixed frame: context line ("X likes this"), author header, text,
   one media block, the action bar, then a comments section. */
:is([data-testid="mainFeed"], [data-testid="NetworkFeedListCollection"]) [role="listitem"] {
  border-radius: var(--lt-radius);

  /* Context line ("X likes this"): an inset pill holding the avatar and text, no divider
     under it. Scoped to the post (the parent of its "Feed post" heading): the "Select feed
     view" row uses the same divider. */
  & div:has(> h2) > hr[role="presentation"] { display: none; }
  & div:has(> h2) > div:has(+ hr[role="presentation"]) {
    padding-bottom: 0;
    & > div:first-child {
      flex: none;
      align-items: center;
      gap: 6px;
      padding: 3px 12px 3px 3px;
      border: 1px solid var(--lt-border);
      border-radius: 9999px;
      background: var(--lt-bg);
    }
    /* The pill no longer fills the row, so push the \u22EF and \xD7 back to the right. */
    & > button:first-of-type { margin-left: auto; }
    & figure { width: 24px; height: 24px; }
    & p { font-size: 13px; line-height: 18px; color: var(--lt-fg); }
  }

  /* Author header: drop the connection degree ("\u2022 3rd+", "\u2022 Following") but keep the
     verified and premium badges that share its span, and the creator links. */
  & div[aria-label] > div + div p > span { font-size: 0; }
  & p:has(> a[target="_blank"][aria-label]:only-child) { display: none; } /* "Visit my website", "View my newsletter", "See my services" */

  /* Media: images and videos sit in nested inline aspect-ratio boxes. Cap the outer one
     and letterbox inside it, so tall screenshots and portrait shots don't fill the screen. */
  & div[style*="aspect-ratio"]:has(> :is(a, div, figure)[style*="aspect-ratio"], video) {
    max-height: 500px;
    border-radius: 8px;
    background: var(--lt-muted);
  }
  & [style*="aspect-ratio"] [style*="aspect-ratio"] { aspect-ratio: auto !important; height: 100%; }
  & [style*="aspect-ratio"] :is(img, video) { max-height: 500px; object-fit: contain; }
}

/* Promoted posts and posts with muted words, tagged by feed.ts. The settings toggle the
   html attributes. A muted post shrinks to one line you can click to show it anyway. */
html[data-lt-hide-ads] [data-lt-ad="true"] { display: none; }
/* LinkedIn promoting itself ("Try LinkedIn Ads", "Hire top talent"): no author or post
   menu, an offer link tagged src=li-ghom and "galapagos" artwork. */
html[data-lt-hide-ads] :is([data-testid="mainFeed"], [data-testid="NetworkFeedListCollection"]) [role="listitem"]:has(a[href*="src=li-ghom"], img[src*="/galapagos-"]):not(:has(svg#ellipses-horizontal-fill-small)) { display: none; }
html:not([data-lt-collapse-filtered]) [data-lt-muted]:not([data-lt-revealed]) { display: none; }
html[data-lt-collapse-filtered] [data-lt-muted]:not([data-lt-revealed]) {
  flex-direction: row;
  gap: 4px;
  padding: 12px 16px;
  font-family: var(--lt-font);
  font-size: 12px;
  line-height: 16px;
  color: var(--lt-muted-fg);
  cursor: pointer;
  & > * { display: none !important; }
  &::before { content: "Muted: mentions \u201C" attr(data-lt-muted) "\u201D."; }
  &::after { content: "Show anyway"; color: var(--lt-primary); font-weight: 600; }
}

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
.lt-card a:hover { background: var(--lt-muted); }

:is(#lt-profile, #lt-mini) .lt-cover { display: block; height: 64px; background: var(--lt-muted) center / cover no-repeat; }
:is(#lt-profile, #lt-mini) .lt-avatar { display: block; width: fit-content; margin: -32px 0 0 16px; position: relative; }
:is(#lt-profile, #lt-mini) .lt-avatar:hover { background: none; }
:is(#lt-profile, #lt-mini) .lt-avatar img { display: block; width: 64px; height: 64px; object-fit: cover; border-radius: 9999px; border: 3px solid var(--lt-card); background: var(--lt-card); }
:is(#lt-profile, #lt-mini) .lt-body { display: grid; gap: 4px; padding: 8px 16px 12px; }
:is(#lt-profile, #lt-mini) .lt-name-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
:is(#lt-profile, #lt-mini) .lt-name { display: inline-flex; align-items: center; gap: 6px; font-size: 22px; line-height: 28px; font-weight: 600; letter-spacing: -0.02em; }
:is(#lt-profile, #lt-mini) .lt-name:hover { background: none; text-decoration: underline; }
:is(#lt-profile, #lt-mini) .lt-name svg { width: 16px; height: 16px; flex: none; color: var(--lt-muted-fg); }
:is(#lt-profile, #lt-mini) .lt-headline { color: var(--lt-muted-fg); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
:is(#lt-profile, #lt-mini) .lt-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin-top: 4px; color: var(--lt-muted-fg); }
:is(#lt-profile, #lt-mini) .lt-company { display: inline-flex; align-items: center; gap: 6px; color: var(--lt-fg); }
:is(#lt-profile, #lt-mini) .lt-company img { width: 16px; height: 16px; border-radius: 4px; }

/* Menu rows inside the profile card, sidebar-style */
#lt-profile .lt-menu, #lt-dashboard .lt-menu, #lt-sidebar .lt-menu { display: grid; padding: 6px; border-top: 1px solid var(--lt-border); }
:is(#lt-dashboard, #lt-sidebar) .lt-menu:first-child { border-top: 0; }
#lt-dashboard .lt-stack { display: grid; min-width: 0; }
#lt-dashboard .lt-stack small { overflow: hidden; color: var(--lt-muted-fg); font-size: 12px; line-height: 16px; text-overflow: ellipsis; white-space: nowrap; }
#lt-dashboard .lt-menu a:has(.lt-stack) svg { align-self: start; margin-top: 2px; }
:is(#lt-profile, #lt-dashboard, #lt-sidebar) .lt-menu a { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 8px; }
:is(#lt-profile, #lt-dashboard, #lt-sidebar) .lt-menu :is(svg, img) { width: 16px; height: 16px; flex: none; color: var(--lt-muted-fg); }
#lt-profile .lt-menu img { border-radius: 4px; }
:is(#lt-profile, #lt-dashboard, #lt-sidebar) .lt-menu strong { margin-left: auto; font-weight: 600; font-variant-numeric: tabular-nums; }
:is(#lt-profile, #lt-dashboard, #lt-sidebar) .lt-menu-label { padding: 6px 10px 2px; color: var(--lt-muted-fg); font-weight: 500; }

/* Games: one horizontally scrollable row */
#lt-games { display: flex; gap: 2px; padding: 6px; overflow-x: auto; scrollbar-width: none; overscroll-behavior-x: contain; }
#lt-games a { flex: 0 0 44px; display: grid; justify-items: center; gap: 4px; padding: 6px 0; border-radius: 8px; }
#lt-games img { width: 28px; height: 28px; border-radius: 6px; }
#lt-games span { font-weight: 500; font-variant-numeric: tabular-nums; }

/* Quick settings: two rows of controls, flush with the column (styles at the end) */

/* LinkedIn Plus config dialog */
#lt-config { width: min(600px, calc(100vw - 32px)); padding: 0; border: 1px solid var(--lt-border); border-radius: var(--lt-radius); background: var(--lt-card); color: var(--lt-fg); font-family: var(--lt-font); font-size: 14px; line-height: 20px; box-shadow: 0 10px 30px rgb(0 0 0 / 0.15); }
#lt-config::backdrop { background: rgb(0 0 0 / 0.5); }
#lt-config header { display: flex; align-items: center; justify-content: space-between; padding: 16px 16px 4px 20px; }
#lt-config h2 { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; }
#lt-config .lt-config-desc { margin: 0; padding: 0 20px 12px; color: var(--lt-muted-fg); }
#lt-config .lt-config-close { display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 6px; background: none; color: var(--lt-muted-fg); cursor: pointer; }
#lt-config .lt-config-close:hover { background: var(--lt-muted); color: var(--lt-fg); }
#lt-config svg { width: 16px; height: 16px; }
#lt-config .lt-config-body { display: grid; grid-template-columns: 140px 1fr; min-height: 280px; border-top: 1px solid var(--lt-border); }
#lt-config [role="tablist"] { display: grid; align-content: start; gap: 2px; padding: 8px; border-right: 1px solid var(--lt-border); }
#lt-config [role="tab"] { padding: 6px 10px; border: 0; border-radius: 6px; background: none; color: var(--lt-muted-fg); font: inherit; font-weight: 500; text-align: left; cursor: pointer; }
#lt-config [role="tab"]:hover { color: var(--lt-fg); }
#lt-config [role="tab"][aria-selected="true"] { background: var(--lt-muted); color: var(--lt-fg); }
#lt-config [role="tab"]:focus-visible { outline: 2px solid var(--lt-muted-fg); outline-offset: -2px; }
#lt-config [role="tabpanel"] { grid-column: 2; }
#lt-config [role="tabpanel"][hidden] { display: none; } /* LinkedIn's CSS sets display on sections */
#lt-config .lt-option { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 20px; cursor: pointer; }
#lt-config .lt-option + .lt-option { border-top: 1px solid var(--lt-border); }
#lt-config .lt-option span { display: grid; gap: 2px; }
#lt-config .lt-option small { font-size: 14px; color: var(--lt-muted-fg); }
#lt-config input[role="switch"] { appearance: none; flex: none; position: relative; width: 32px; height: 18px; margin: 0; border-radius: 9999px; background: var(--lt-border); cursor: pointer; transition: background 0.15s; }
#lt-config input[role="switch"]::before { content: ""; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 9999px; background: var(--lt-card); transition: translate 0.15s; }
#lt-config input[role="switch"]:checked { background: var(--lt-primary); }
#lt-config input[role="switch"]:checked::before { translate: 14px 0; }
#lt-config .lt-muted-words { flex-direction: column; align-items: stretch; gap: 8px; cursor: default; }
#lt-config textarea { box-sizing: border-box; width: 100%; padding: 8px 10px; border: 1px solid var(--lt-border); border-radius: 8px; background: none; color: inherit; font: inherit; resize: vertical; }
#lt-config textarea:focus-visible { outline: 2px solid var(--lt-muted-fg); outline-offset: 1px; }
#lt-config input[role="switch"]:focus-visible { outline: 2px solid var(--lt-muted-fg); outline-offset: 2px; }

/* Composer. Our box replaces LinkedIn's sharebox (hidden, but kept: its "Start a post"
   button opens LinkedIn's composer). Docked, the composer is a non-modal dialog pinned
   onto our box; our box grows to its height (composer.ts). */
[data-testid="mainFeed"] > :has(#draft-text-replaceable-component) { display: none !important; }
#lt-compose { display: grid; gap: 8px; padding: 12px; anchor-name: --lt-compose; }
#lt-compose[data-docked] > * { visibility: hidden; }
#lt-compose button, #lt-compose .lt-compose-bar a { all: unset; box-sizing: border-box; cursor: pointer; }
#lt-compose .lt-compose-input { padding: 10px 12px; border: 1px solid var(--lt-border); border-radius: 8px; color: var(--lt-muted-fg); cursor: text; }
#lt-compose .lt-compose-input:hover { background: var(--lt-muted); }
#lt-compose .lt-compose-bar { display: flex; align-items: center; gap: 4px; }
#lt-compose .lt-compose-bar :is(button, a) { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px; font-weight: 500; }
#lt-compose .lt-compose-bar :is(button, a):hover { background: var(--lt-muted); }
#lt-compose :is(button, a):focus-visible { outline: 2px solid var(--lt-muted-fg); outline-offset: 1px; }
#lt-compose svg { width: 16px; height: 16px; color: var(--lt-muted-fg); }
dialog[open]:has([data-sdui-screen$="ShareCompose"]) { border-radius: var(--lt-radius); }
dialog[data-lt-docked][open] {
  position: fixed;
  position-anchor: --lt-compose;
  inset: auto;
  top: anchor(top);
  left: anchor(left);
  width: anchor-size(width);
  max-width: none;
  margin: 0;
  transform: none;
  translate: none;
  box-shadow: none;
  border: 1px solid var(--lt-border);
  background: var(--lt-card);
  /* Non-modal, so it shares the page's layers: above the feed (which comes later in the
     DOM), below the global header it slides under when the feed scrolls. */
  z-index: 1;
}
/* Loading skeleton: held at the composer's height (composer.ts) so the page doesn't jump. */
dialog[data-lt-docked][open]:not(:has([data-sdui-screen$="ShareCompose"])) { height: var(--lt-composer-height, 290px); overflow: hidden; }
header:has(nav a[href*="/jobs/"]) { position: relative; z-index: 2; }

/* LinkedIn's composer, restyled (docked or popup). Hooks are structural: the screen id,
   icon ids (svg#\u2026-medium), aria roles, and the inline aspect-ratio that fixes its size. */
[data-sdui-screen$="ShareCompose"] :is(p, span, [role="textbox"]) { font-size: 14px; line-height: 20px; }
/* Size: LinkedIn pins it to 800\xD7640 (aspect-ratio 1.25 on a wrapper); let content decide. */
dialog:has([data-sdui-screen$="ShareCompose"]) { height: fit-content; max-height: calc(100dvh - 64px); }
[data-sdui-screen$="ShareCompose"] [style*="aspect-ratio"] { aspect-ratio: auto !important; }
[data-sdui-screen$="ShareCompose"] [data-testid="lazy-column"] { min-height: 72px !important; } /* inline 27.2rem */
/* Layout (parts tagged by composer.ts): identity, toolbar, editor, then a footer with the
   post's settings on the left and Schedule/Post on the right. */
dialog:has([data-sdui-screen$="ShareCompose"]) { overflow: hidden; }
dialog:has([data-sdui-screen$="ShareCompose"]):focus-visible,
[popover]:has(input[type="radio"]):focus-visible { outline: none; }
[data-lt-c="avatar"] { zoom: 0.625; } /* 64px -> 40px, keeps a group's logo badge in place */
[data-lt-c="flatten"] { display: contents !important; }
[data-lt-c="toolbar"] { order: -1; display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-bottom: 1px solid var(--lt-border); }
/* Formatting (emoji, bold) | inserts (media, celebration, event, job, poll, document) ... Proofread */
[data-lt-c="toolrow"] { flex: 1; display: flex; align-items: center; gap: 8px; }
[data-lt-c="proofread"] { order: 2; margin-left: auto; }
/* Gaps only on the two real rows: each button's own wrappers are grids with an empty first
   column, so a gap there would push the button sideways. */
[data-lt-c="tools"], [data-lt-c="items"] { display: flex; align-items: center; gap: 4px; }
[data-lt-c="tools"] > * { margin: 0; }
/* 8px either side of each divider: emoji, bold | media | celebration, event, job, ... */
[data-lt-c="tools"] > [data-lt-c="insert"] { margin-left: 4px; padding-left: 8px; border-left: 1px solid var(--lt-border); }
[data-lt-c="media"] { margin-right: 4px; padding-right: 8px; border-right: 1px solid var(--lt-border); }
/* Bold sits in wrappers fixed at 48px wide around its 32px button; let them fit. */
[data-sdui-screen$="ShareCompose"] div:has(svg#text-bold-fill-medium):not(:has(svg#emoji-outline-medium), :has(> svg#text-bold-fill-medium), :has(> div > svg#text-bold-fill-medium)) { width: fit-content; min-width: 0; grid-template-columns: auto; }
[data-lt-c="more"] { display: none !important; }
[data-lt-c="main"] { position: relative; }
/* The header is sticky, which would make it the chips' containing block. */
[data-lt-c="main"] > :has([data-lt-c="chips"]) { position: static !important; }
[data-lt-c="footer"] { box-sizing: border-box; min-height: 56px; }
[data-lt-c="chips"] { position: absolute; left: 16px; bottom: 0; height: 56px; display: flex; align-items: center; gap: 2px; }
/* Post settings as plain clickable text. Collaborators only when LinkedIn allows them
   (visibility "Anyone"); otherwise it marks the button aria-disabled. */
[data-lt-c="chips"] [role="button"] > div:last-child { box-sizing: border-box; height: 32px; padding: 0 8px; border: 0; border-radius: 8px; background: none; color: var(--lt-muted-fg); }
[data-lt-c="chips"] [role="button"]:hover > div:last-child { background: var(--lt-muted); color: var(--lt-fg); }
[data-lt-c="chips"] [role="button"] :is(svg, p) { color: inherit; }
[data-lt-c="chips"] [role="button"] p { font-weight: 500; }
[data-lt-c="chips"] [role="button"] svg:not(#venn-diagram-outline-small) { display: none; }
[data-lt-c="chips"] [role="button"][aria-disabled="true"] { display: none; }
/* The "post as" switcher: a borderless dropdown with a chevron. */
[data-sdui-screen$="ShareCompose"] [role="button"][aria-label][aria-expanded] > div:last-child { box-sizing: border-box; height: 32px; gap: 6px; padding: 0 8px; border: 0; border-radius: 8px; background: transparent; }
[data-sdui-screen$="ShareCompose"] [role="button"][aria-label][aria-expanded]:hover > div:last-child { background: var(--lt-muted); }
[data-sdui-screen$="ShareCompose"] [role="button"][aria-label][aria-expanded] svg#caret-down-fill-small { display: none; }
[data-sdui-screen$="ShareCompose"] [role="button"][aria-label][aria-expanded] > div:last-child::after {
  content: "";
  flex: none;
  width: 16px;
  height: 16px;
  background: currentColor;
  opacity: 0.6;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") center / 16px no-repeat;
}
/* Toolbar: 32px ghost icon buttons (emoji, media, more, schedule; bold is a plain div). */
[data-sdui-screen$="ShareCompose"] :is(button, a) { min-height: 32px; }
[data-sdui-screen$="ShareCompose"] svg[id$="-medium"] { width: 20px; height: 20px; min-width: 20px; min-height: 20px; }
[data-sdui-screen$="ShareCompose"] :is(button, a) > span:has(> svg[id$="-medium"]),
[data-sdui-screen$="ShareCompose"] :is(div:has(> svg#text-bold-fill-medium), div:has(> div > svg#text-bold-fill-medium)) {
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  padding: 6px;
  border-radius: 8px;
}
[data-sdui-screen$="ShareCompose"] :is(div:has(> svg#text-bold-fill-medium), div:has(> div > svg#text-bold-fill-medium)) { display: grid; place-items: center; padding: 0; }
[data-lt-c="tools"] :is(button, a) > span:has(> svg[id$="-medium"]),
[data-lt-c="tools"] div:has(> svg#text-bold-fill-medium) { border: 1px solid var(--lt-border); }
[data-sdui-screen$="ShareCompose"] div:has(> div > div > div > svg#text-bold-fill-medium) { display: grid; align-items: center; }
/* Text buttons (Proofread, Post): 32px, 8px radius. */
[data-sdui-screen$="ShareCompose"] button > span:has(> svg#premium-chip-fill-color-small) { height: 32px; border-radius: 8px; }
[data-sdui-screen$="ShareCompose"] button > span:not(:has(svg)) { box-sizing: border-box; height: 32px; padding: 0 16px; border-radius: 8px; }

/* Global header (nav.ts), React and Ember. The row spans the page container's width
   (--lt-page-width, measured), For Business and Learning move into More, and More gets
   LinkedIn's own three-dot glyph instead of the hamburger. */
header div:has(> div > nav a[href*="/jobs/"]),
#global-nav .global-nav-v2__content {
  box-sizing: border-box;
  width: var(--lt-page-width, min(1128px, 100% - 40px));
  max-width: none;
  margin-inline: auto;
  padding-inline: 0;
}
header div:has(> nav svg#grid-fill-medium),
header div:has(> div > nav svg#grid-fill-medium) > hr,
#global-nav :is(.global-nav-v2__divider, .global-nav__app-launcher-menu, li:has(> a[href*="/learning/"])) { display: none; }
header button:has(svg#bars-outline-medium) svg#bars-outline-medium,
#global-nav .global-nav__more .global-nav__primary-link > svg {
  background: currentColor;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M11.401 8a1.4 1.4 0 1 1 2.8 0 1.4 1.4 0 0 1-2.8 0M6.6 8a1.4 1.4 0 1 1 2.802 0A1.4 1.4 0 0 1 6.6 8M1.8 8a1.4 1.4 0 1 1 2.802 0 1.4 1.4 0 0 1-2.801 0z'/%3E%3C/svg%3E") center / 24px no-repeat;
  & > * { display: none; }
}
header button:has(svg#bars-outline-medium) svg#caret-down-fill-small,
#global-nav .global-nav__more .global-nav__primary-link-text svg { display: none; }

/* Messaging: one column. The sidebar (Page inboxes, an ad, the footer) goes; the inboxes are
   links in the filter row instead (messaging.ts). The floating Messaging bar repeats the page. */
.scaffold-layout__row:has(> .msg__list-detail) {
  grid-template-columns: 1fr !important;
  grid-template-areas: "main" !important;
  & > .scaffold-layout__aside { display: none; }
}
body:has(.msg__list-detail) #msg-overlay, html[data-lt-hide-msg-overlay] #msg-overlay { display: none; }
html[data-lt-nav-in-flow] .authentication-outlet { padding-top: 0 !important; }
.msg-conversations-container__title-row:has(#lt-inboxes) { justify-content: space-between; gap: 8px; }
/* Ember's own colour tokens follow its theme; ours (light-dark()) only follow color-scheme,
   which Ember's dark mode doesn't always set. */
#lt-inboxes {
  display: flex; flex: none; align-items: center; gap: 6px; padding-right: 12px; font-family: var(--lt-font); font-size: 13px;
  & a { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px 0 4px; border: 1px solid var(--color-border-faint, var(--lt-border)); border-radius: 9999px; color: var(--color-text, var(--lt-fg)); font-weight: 500; text-decoration: none; }
  & a:hover { background: var(--color-background-container-tint, var(--lt-muted)); }
  & img, & svg { width: 20px; height: 20px; border-radius: 9999px; object-fit: cover; }
  & svg { padding: 3px; box-sizing: border-box; color: var(--color-text-low-emphasis, var(--lt-muted-fg)); }
}

/* Quiet Home (setting): no notification dot on Home. React: an empty span next to the
   house icon; Ember: the usual badge. */
html[data-lt-quiet-home] header nav :is(a, button):has(svg[id^="house-"]) span:has(> svg) > :not(svg),
html[data-lt-quiet-home] #global-nav a[href*="/feed/"] .notification-badge { display: none; }

/* What we add to the More menu: Learning, then a For Business group. */
.lt-more { margin-top: 4px; padding-block: 4px; border-top: 1px solid var(--lt-border); font-family: var(--lt-font); font-size: 14px; line-height: 20px; }
.lt-more > a, .lt-more summary { display: flex; justify-content: space-between; padding: 8px 16px; color: var(--lt-fg); text-decoration: none; cursor: pointer; }
.lt-more summary { list-style: none; }
.lt-more summary::-webkit-details-marker { display: none; }
.lt-more summary::after { content: "\u25BE"; color: var(--lt-muted-fg); }
.lt-more details[open] summary::after { content: "\u25B4"; }
.lt-more details a { display: block; padding: 6px 16px 6px 28px; color: var(--lt-muted-fg); text-decoration: none; }
.lt-more :is(a, summary):hover { background: var(--lt-muted); color: var(--lt-fg); }

/* Sidebar settings (settings.ts): theme toggle, LinkedIn Plus, and Help & legal, whose
   popover holds the footer links. Popovers close on Escape or a click elsewhere. */
#lt-settings { display: grid; gap: 8px; font-family: var(--lt-font); font-size: 14px; line-height: 20px; color: var(--lt-muted-fg); }
#lt-settings .lt-setting { display: flex; gap: 8px; }
#lt-settings [role="radiogroup"] { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--lt-border); border-radius: 8px; }
#lt-settings button { display: grid; place-items: center; width: 28px; height: 24px; padding: 0; border: 0; border-radius: 6px; background: none; color: var(--lt-muted-fg); cursor: pointer; }
#lt-settings button:hover { color: var(--lt-fg); }
#lt-settings button[aria-checked="true"] { background: var(--lt-muted); color: var(--lt-fg); }
#lt-settings svg { width: 16px; height: 16px; }
#lt-settings .lt-language { position: relative; flex: 1; min-width: 0; display: flex; align-items: center; height: 30px; box-sizing: border-box; border: 1px solid var(--lt-border); border-radius: 8px; cursor: pointer; }
#lt-settings .lt-language:hover { color: var(--lt-fg); }
#lt-settings .lt-language:has(select:focus-visible) { outline: 2px solid var(--lt-muted-fg); outline-offset: 1px; }
#lt-settings .lt-language svg { position: absolute; pointer-events: none; }
#lt-settings .lt-language svg:first-child { left: 8px; }
#lt-settings .lt-language svg:last-child { right: 6px; width: 14px; height: 14px; }
#lt-settings .lt-language select { appearance: none; width: 100%; min-width: 0; height: 100%; padding: 0 26px 0 30px; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; outline: none; }
#lt-settings .lt-plus { flex: 1; display: flex; align-items: center; gap: 8px; width: auto; height: 30px; padding: 0 8px; border: 1px solid var(--lt-border); border-radius: 8px; font: inherit; white-space: nowrap; }
#lt-settings .lt-plus[popovertarget] { anchor-name: --lt-links; }
#lt-links {
  position: fixed; inset: auto; margin: 0;
  position-anchor: --lt-links; top: calc(anchor(bottom) + 4px); right: anchor(right); /* opens leftwards from Help & legal, over the sidebar */
  position-try-fallbacks: flip-block;
  box-sizing: border-box; width: 280px; padding: 12px 16px;
  border: 1px solid var(--lt-border); border-radius: var(--lt-radius);
  background: var(--lt-card); color: var(--lt-fg); box-shadow: 0 10px 30px rgb(0 0 0 / 0.15);
  font-family: var(--lt-font); font-size: 14px; line-height: 20px;
  /* Help and LinkedIn stack in the first column, Legal fills the second. */
  & .lt-links-groups { display: grid; grid-template-columns: 1fr 1fr; grid-auto-flow: dense; gap: 12px 16px; }
  & .lt-links-groups > :nth-child(2) { grid-column: 2; grid-row: span 2; }
  & h3 { margin: 0 0 4px; font-size: 12px; line-height: 16px; font-weight: 600; color: var(--lt-muted-fg); }
  & a { display: block; padding: 2px 0; color: var(--lt-fg); text-decoration: none; }
  & a:hover { text-decoration: underline; }
  & p { margin: 12px 0 0; font-size: 12px; line-height: 16px; color: var(--lt-muted-fg); }
}
`;

  // src/main.ts
  function update() {
    const identity = document.getElementById("feedIdentityModuleComponentRef");
    const me = identity && readProfile(identity);
    if (identity) {
      const profile = sync("lt-profile", me, renderProfile, identity);
      const games = sync("lt-games", config().hideGames ? null : readGames(), renderGames, profile ?? identity);
      sync("lt-settings", true, () => renderSettings(update), games ?? profile ?? identity);
      refreshSettings();
    }
    document.documentElement.toggleAttribute("data-lt-quiet-home", config().quietHome);
    document.documentElement.toggleAttribute("data-lt-hide-msg-overlay", config().hideMessagingOverlay);
    updateProfile(update);
    updateSidebar(update);
    placeCompose();
    enhanceComposer();
    extendMoreMenu();
    matchPageWidth();
    markPosts();
    markJobs();
    updateMessaging();
  }
  var ourFrame = window === window.top || location.pathname.startsWith("/preload/");
  if (ourFrame && !window.__linkedinTidy) {
    window.__linkedinTidy = true;
    addStyle("lt-style", styles_default);
    installPickerGuard();
    installComposerDock();
    installMutedReveal();
    followOsTheme();
    document.addEventListener("close", () => update(), true);
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        update();
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
