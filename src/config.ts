import { h } from './dom';

// Behaviour switches, saved per browser. Read at the moment they matter, so a change
// applies without a reload.
export const OPTIONS = [
  { key: 'inlineComposer', default: true, label: 'Open the composer in the feed', hint: 'Off opens it as LinkedIn’s popup.' },
  { key: 'hideAds', default: true, label: 'Hide promoted posts', hint: 'Ads in the feed that look like regular posts.' },
  { key: 'instantFilePicker', default: false, label: 'Open the file picker right away', hint: 'When adding a photo or video. Off shows the upload screen first.' },
  { key: 'hideGames', default: false, label: 'Hide LinkedIn games', hint: 'The puzzles row in the sidebar.' },
  { key: 'collapseFiltered', default: true, label: 'Show muted posts as a line', hint: 'Off hides posts with muted words completely.' },
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
