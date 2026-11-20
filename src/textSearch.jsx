import { Fragment } from 'react';

// Shared text search for the reading pages (pravachan, adhiveshan prasangs).
// Zero-width joiners and the Gujarati virama (્) are ignored so "સદગુણ" finds "સદ્‌ગુણ".
const IGNORE = /[‌‍્]/g;
const JOINERS = /[‌‍]/g;

// Gujarati digits count as ASCII ones, so "સારંગપુર 10" finds "સારંગપુર ૧૦"
export const norm = (s) =>
  (s || '')
    .replace(IGNORE, '')
    .replace(/[૦-૯]/g, (d) => String(d.charCodeAt(0) - 0x0ae6))
    .toLowerCase();
export const searchTerms = (q) => norm(q).split(/\s+/).filter(Boolean);
export const matchesAll = (hay, terms) => terms.every((t) => hay.includes(t));

export function Highlight({ text, terms }) {
  if (!terms.length) return text;
  const plain = text.replace(JOINERS, '');
  const esc = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return plain
    .split(new RegExp(`(${esc.join('|')})`, 'gi'))
    .map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>));
}

// A window of text around the first search term
export function snippet(text, terms, size = 220) {
  const plain = text.replace(JOINERS, '');
  const at = terms.length ? Math.max(0, norm(plain).indexOf(terms[0])) : 0;
  const start = Math.max(0, at - 60);
  return `${start > 0 ? '…' : ''}${plain.slice(start, start + size)}${start + size < plain.length ? '…' : ''}`;
}
