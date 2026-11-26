// Job search: promoted listings get a visible mark (styles.css). LinkedIn marks them only with
// the word "Promoted" at the end of the card, a plain line like "Viewed" or "Be an early
// applicant", so this needs the English interface.
const CARD = '[componentkey^="job-card-component-ref-"]';

export function markJobs(): void {
  if (!document.documentElement.lang.startsWith('en')) return;
  for (const p of document.querySelectorAll(`${CARD} p:not([data-lt-promoted])`)) {
    if (!p.children.length && p.textContent?.trim() === 'Promoted') p.setAttribute('data-lt-promoted', '');
  }
}
