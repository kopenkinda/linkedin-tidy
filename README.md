# LinkedIn Tidy

[![Install userscript](https://img.shields.io/badge/Install-userscript-00485B?logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/kopenkinda/linkedin-tidy/dist/linkedin-tidy.user.js)
[![Build](https://github.com/kopenkinda/linkedin-tidy/actions/workflows/build.yml/badge.svg)](https://github.com/kopenkinda/linkedin-tidy/actions/workflows/build.yml)

A userscript and Chrome MV3 extension built from one bundle. It turns LinkedIn into a two-column layout with a sidebar of its own, cuts out most ads and Premium upsells, and fixes a handful of small annoyances.

Everything runs locally in the browser and reads only what LinkedIn has already loaded on the page, with one optional exception noted below.

## Install

### Tampermonkey userscript

1. Install [Tampermonkey](https://www.tampermonkey.net/) if you do not already have it.
2. Open the [latest userscript build](https://raw.githubusercontent.com/kopenkinda/linkedin-tidy/dist/linkedin-tidy.user.js) or click the badge at the top of this page.
3. Tampermonkey will prompt you to install it and will check that same URL for updates automatically.

### Chrome extension

1. Download [linkedin-tidy.zip](https://raw.githubusercontent.com/kopenkinda/linkedin-tidy/dist/linkedin-tidy.zip) and unzip it.
2. Open `chrome://extensions` and turn on Developer mode.
3. Click Load unpacked and select the unzipped folder.

You can also build from source and load the `dist/` folder directly.

## What it changes

### Feed

- Switches to a 25/75 two-column layout and removes the right rail. The left sidebar holds a compact profile card with your stats, shortcuts to Dashboard, Saved posts, and Settings, pages you manage, a scrollable row of LinkedIn's daily puzzles, and the quick settings block.
- Replaces the sharebox with a composer pinned above the For you and Network tabs. By default, LinkedIn's own composer opens inline inside the feed instead of as a modal popup, with the content-type buttons expanded and shorter Visibility and Comments labels.
- Stops the Photo or video button from immediately opening your OS file picker, so you land on LinkedIn's upload screen first. You can turn that guard off in settings.
- Hides promoted posts, LinkedIn self-promo cards, and Launchpad banners by default.
- Filters posts by a per-browser list of muted words or phrases. Matching posts collapse to a single "Show anyway" line, or disappear completely if you turn collapsing off.
- Caps post images and videos at 500px tall, turns context lines like "X likes this" into compact pills, and strips connection degrees and creator promo links from author headers.

### Profile

- Uses the same two-column layout and replaces LinkedIn's right rail with our sidebar.
- On someone else's profile, a sticky mini profile card in the sidebar replaces the top card and LinkedIn's floating bar, keeping their details, stats, mutual connections, current companies or school, links, and action buttons within reach while you scroll. The main column starts with About, and Activity moves below Languages.
- On your own profile, the top card stays editable, while your private dashboard numbers, profile language, and public URL links move into the sidebar.
- Draws Languages as a compact two-column list instead of tall rows. An optional setting loads the full language list in the background instead of stopping at two.
- Hides "Suggested for you" prompts and post-connect drawers by default, plus Sales Insights when it is a Premium upsell.
- Blurs email addresses, phone numbers, and links inside the Contact info dialog until you click them, which helps when sharing your screen.

### My Network

- Redraws LinkedIn's navigation links in the left sidebar, puts Invitations at the top, and keeps the list visible on the invitation manager page where LinkedIn omits it.
- Hides Premium upsells, puzzles, and the empty "No pending invitations" card, and styles Grow and Catch up as underline tabs.

### Jobs

- Moves Jobs home links into the left sidebar and hides the Hiring Pro and Premium upsell rows.
- On job search, marks promoted listings with an amber edge and badge, and collapses dismissed jobs to a faded title and company alongside LinkedIn's Undo button.

### Notifications

- Uses the two-column layout, drops the right-rail ad and footer, and puts Manage notifications in the left sidebar above quick settings.

### Messaging

- Drops the right sidebar so conversations take the full width, and moves Page inboxes for pages you manage into pills in the filter row.
- Hides the duplicate floating chat bar on the Messaging page. A setting lets you hide that corner overlay on every other page too.

### Header and LinkedIn Plus

- Aligns the top bar to the active page width on both React and Ember pages, moves Learning and For Business into the More menu, and swaps the hamburger icon for three dots.
- Quiet Home, on by default, removes the notification dot on the Home icon.
- Quick settings sit at the bottom of the sidebar on every two-column page. From there you can switch between Light, Dark, and System themes using LinkedIn's own cookies, change your account's interface language, open LinkedIn's footer links in a Help & legal popover, or open the LinkedIn Plus dialog to toggle any per-browser option and edit muted words.

## Good to know

- **Show all languages is off by default.** Turning it on makes background requests to each profile's language details page. LinkedIn can flag those extra requests as scraping, so leave it off if you see a warning on your account.
- **A few tweaks require English.** Marking promoted job cards (`src/jobs.ts`) and shortening the composer's Visibility and Comments labels (`src/composer.ts`) match LinkedIn's English text and stay inactive in other languages.
- **LinkedIn changes its markup often.** The script hooks into structural attributes rather than hashed class names, but LinkedIn updates still break selectors from time to time.

## Development

```bash
pnpm install
pnpm dev      # esbuild watch
pnpm build    # one-off build
pnpm check    # TypeScript typecheck
```

Builds write `manifest.json` and `linkedin.user.js` to `dist/`.

To test the userscript live against your local build, install `tampermonkey-dev.user.js` in Tampermonkey, change its `@require` path to your checkout's `dist/linkedin.user.js`, and enable "Allow access to file URLs" for Tampermonkey in `chrome://extensions`.

GitHub Actions (`.github/workflows/build.yml`) runs `pnpm check` and `pnpm build` on every push and pull request. Pushes to `main` also publish `linkedin-tidy.user.js` and `linkedin-tidy.zip` to the `dist` branch with the CI run number appended to the version so Tampermonkey picks up each new build.

## License

[MIT](LICENSE)
