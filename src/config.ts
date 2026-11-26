import { h } from './dom';

// Behaviour switches, saved per browser and grouped by the page they change. Read at the
// moment they matter, so a change applies without a reload.
export const PAGES = [
  { id: 'general', label: 'General' },
  { id: 'feed', label: 'Feed' },
  { id: 'profile', label: 'Profile' },
] as const;

export type PageId = (typeof PAGES)[number]['id'];

export const OPTIONS = [
  { page: 'general', key: 'quietHome', default: true, label: 'Quiet Home', hint: 'No notification dot on Home in the header.' },
  { page: 'general', key: 'hideMessagingOverlay', default: false, label: 'Hide the messaging overlay', hint: 'The chat bar in the corner of every page. Messages stay on the Messaging page.' },
  { page: 'feed', key: 'inlineComposer', default: true, label: 'Open the composer in the feed', hint: 'Off opens it as LinkedIn’s popup.' },
  { page: 'feed', key: 'instantFilePicker', default: false, label: 'Open the file picker right away', hint: 'When adding a photo or video. Off shows the upload screen first.' },
  { page: 'feed', key: 'hideAds', default: true, label: 'Hide promoted posts', hint: 'Ads in the feed that look like regular posts.' },
  { page: 'feed', key: 'hideGames', default: false, label: 'Hide LinkedIn games', hint: 'The puzzles row in the sidebar.' },
  { page: 'feed', key: 'collapseFiltered', default: true, label: 'Show muted posts as a line', hint: 'Off hides posts with muted words completely.' },
  { page: 'profile', key: 'hideProfileSuggestions', default: true, label: 'Hide “Suggested for you”', hint: 'LinkedIn’s prompts to add to your profile, and people to follow.' },
  { page: 'profile', key: 'allLanguages', default: false, label: 'Show all languages', hint: 'Loads a profile’s full language list in the background instead of two and “Show all”. Risky: the extra requests can make LinkedIn warn you about scraping. If it does, turn this off.' },
  { page: 'profile', key: 'blurContacts', default: true, label: 'Blur contact info', hint: 'Emails, phone numbers and links stay blurred until you click them. Safer when sharing your screen.' },
] as const;

export type ConfigKey = (typeof OPTIONS)[number]['key'];
export type Config = Record<ConfigKey, boolean>;

const CONFIG_KEY = 'linkedin-plus';

// LinkedIn wraps Storage.prototype so only keys on its tracker allowlist can be read or
// written; anything else silently returns null and is reported in an audit event. A
// throwaway iframe still has the browser's own methods.
let nativeStorage: { get(key: string): string | null; set(key: string, value: string): void } | undefined;

function storage() {
  if (!nativeStorage) {
    const frame = h('iframe', { hidden: true });
    document.documentElement.append(frame);
    const proto = (frame.contentWindow as (Window & typeof globalThis) | null)?.Storage.prototype ?? Storage.prototype;
    const { getItem, setItem } = proto;
    frame.remove();
    nativeStorage = {
      get: (key) => getItem.call(localStorage, key),
      set: (key, value) => setItem.call(localStorage, key, value),
    };
  }
  return nativeStorage;
}

function saved(): Record<string, unknown> {
  try {
    return JSON.parse(storage().get(CONFIG_KEY) ?? '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

function save(patch: Record<string, unknown>) {
  storage().set(CONFIG_KEY, JSON.stringify({ ...saved(), ...patch }));
}

export function config(): Config {
  const values = saved();
  return Object.fromEntries(OPTIONS.map((o) => [o.key, typeof values[o.key] === 'boolean' ? values[o.key] : o.default])) as Config;
}

export function setConfig(key: ConfigKey, value: boolean): void {
  save({ [key]: value });
}

/** Words and phrases that filter a post out of the feed. */
export function mutedWords(): string[] {
  const words = saved().mutedWords;
  return Array.isArray(words) ? words.filter((w): w is string => typeof w === 'string') : [];
}

export function setMutedWords(words: string[]): void {
  save({ mutedWords: words });
}
