import { addStyle } from './dom';

// LinkedIn's React tokens have hashed names but readable values, always of the form
// light-dark(<light>, <dark>). The light value tells us the role (canvas, text, border,
// brand...); both sides are then pointed at shadcn neutrals.
const LIGHT: Record<string, string> = {
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

const DARK: Record<string, string> = {
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

/** "light-dark(rgb(0 0 0 / 0.9), #fff)" -> ["rgb(0 0 0 / 0.9)", "#fff"] */
function splitLightDark(value: string): [string, string] | null {
  const inner = /^light-dark\((.*)\)$/i.exec(value)?.[1];
  if (!inner) return null;
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '(') depth++;
    else if (inner[i] === ')') depth--;
    else if (inner[i] === ',' && depth === 0) {
      return [inner.slice(0, i).trim().toLowerCase(), inner.slice(i + 1).trim().toLowerCase()];
    }
  }
  return null;
}

export function applyPalette(): void {
  const cs = getComputedStyle(document.documentElement);
  const decls: string[] = [];
  for (const name of cs) {
    if (!name.startsWith('--')) continue;
    const pair = splitLightDark(cs.getPropertyValue(name).trim());
    const light = pair && LIGHT[pair[0]];
    if (pair && light) decls.push(`${name}:light-dark(${light},${DARK[pair[1]] ?? pair[1]})`);
  }
  // [data-color-scheme] too, in case LinkedIn redeclares tokens where it sets the scheme.
  if (decls.length) addStyle('lt-palette', `:root,[data-color-scheme]{${decls.join(';')}}`);
  // Tokens appear once LinkedIn's stylesheet loads; Ember pages never have them.
  else if (document.readyState !== 'complete') requestAnimationFrame(applyPalette);
}
