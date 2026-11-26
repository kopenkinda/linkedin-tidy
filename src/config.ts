import { h } from './dom';

// Behaviour switches, saved per browser. Read at the moment they matter, so a change
// applies without a reload.
export const OPTIONS = [
  { key: 'inlineComposer', default: true, label: 'Open the composer in the feed', hint: 'Off opens it as LinkedIn’s popup.' },
  { key: 'instantFilePicker', default: false, label: 'Open the file picker right away', hint: 'When adding a photo or video. Off shows the upload screen first.' },
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

export function config(): Config {
  let saved: Partial<Config> = {};
  try {
    saved = JSON.parse(storage().get(CONFIG_KEY) ?? '{}') as Partial<Config>;
  } catch {}
  return Object.fromEntries(OPTIONS.map((o) => [o.key, saved[o.key] ?? o.default])) as Config;
}

export function setConfig(key: ConfigKey, value: boolean): void {
  storage().set(CONFIG_KEY, JSON.stringify({ ...config(), [key]: value }));
}
