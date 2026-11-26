// Small DOM helpers. Everything is built with createElement: LinkedIn's Trusted Types
// default policy blanks any innerHTML assignment.

type Attrs = Record<string, string | number | boolean | null | undefined>;
export type Child = Node | string | null | undefined | false | Child[];

function flatten(children: Child[], out: (Node | string)[] = []): (Node | string)[] {
  for (const child of children) {
    if (Array.isArray(child)) flatten(child, out);
    else if (child != null && child !== false && child !== '') out.push(child);
  }
  return out;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value != null && value !== false) el.setAttribute(key, String(value));
  }
  el.append(...flatten(children));
  return el;
}

/** A Lucide icon as a list of [tag, attributes] shapes on a 24×24 grid. */
export type Icon = [tag: string, attrs: Record<string, string | number>][];

export function icon(shapes: Icon): SVGSVGElement {
  const svg = <T extends SVGElement>(tag: string, attrs: Record<string, string | number>) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag) as T;
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    return el;
  };
  const root = svg<SVGSVGElement>('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
  root.append(...shapes.map(([tag, attrs]) => svg(tag, attrs)));
  return root;
}

export function addStyle(id: string, text: string): void {
  const el = h('style', { id });
  el.textContent = text;
  document.documentElement.append(el);
}

/** Polls until `find` returns something truthy. Rejects after `timeout` ms. */
export function until<T>(find: () => T | null | undefined | false, timeout = 6000): Promise<T> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function poll() {
      const found = find();
      if (found) resolve(found);
      else if (Date.now() - start > timeout) reject(new Error('LinkedIn did not respond in time'));
      else setTimeout(poll, 50);
    })();
  });
}

/** Last rendered data per element id, so we only re-render on change. */
export const signatures = new Map<string, string>();

/**
 * Keeps our element `id` right after `after`, re-rendering only when `data` changes.
 * React may move or drop our node when it re-renders; this puts it back.
 */
export function sync<T>(id: string, data: T | null | undefined, render: (data: T) => HTMLElement, after: Element): HTMLElement | undefined {
  let el = document.getElementById(id) ?? undefined;
  if (!data) {
    el?.remove();
    return undefined;
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
