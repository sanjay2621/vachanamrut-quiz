import { Fragment, useEffect, useMemo, useState } from 'react';
import { useLang } from '../i18n.js';
import { isAdminUnlocked } from '../storage.js';
import { CODE_HASH, Gate } from './Admin.jsx';

// Pravachan library (#/pravachan, #/pravachan/<id>, #/pravachan/<id>/<itemKey>):
// reachable only through the admin page and behind the same access code.
// Content is static in public/data/pravachan.json: pravachans[] with a subject and
// sections[] of items ({ type: 'p' | 'quote' | 'prasang', title?, text }).
// Paragraphs inside an item are split by \n.

// Zero-width joiners and the virama (્) are dropped so સદગુણ finds સદ્‌ગુણ
const norm = (s) => (s || '').replace(/[‌‍્]/g, '').toLowerCase();

function Highlight({ text, terms }) {
  if (!terms.length) return text;
  const clean = text.replace(/[‌‍]/g, '');
  const esc = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = clean.split(new RegExp(`(${esc.join('|')})`, 'gi'));
  return parts.map((p, i) =>
    i % 2 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>
  );
}

const paragraphs = (text) => text.split('\n');

// Every item, flattened with its place in the pravachan, for search and jumping
function flatten(pravachans) {
  const out = [];
  for (const p of pravachans)
    p.sections.forEach((s, si) =>
      s.items.forEach((it, ii) =>
        out.push({ p, section: s, item: it, key: `${si}-${ii}`, hay: norm(`${it.title || ''} ${it.text} ${s.heading}`) })
      )
    );
  return out;
}

function snippet(text, terms, size = 220) {
  const n = norm(text);
  const at = terms.length ? Math.max(0, n.indexOf(terms[0])) : 0;
  const start = Math.max(0, at - 60);
  const clean = text.replace(/[‌‍]/g, '');
  const s = clean.slice(start, start + size);
  return `${start > 0 ? '…' : ''}${s}${start + size < clean.length ? '…' : ''}`;
}

export default function Pravachan({ id, itemKey }) {
  const { t, num } = useLang();
  const [unlocked, setUnlocked] = useState(() => isAdminUnlocked(CODE_HASH));
  const [lib, setLib] = useState(null);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('all');
  const [prasangOnly, setPrasangOnly] = useState(false);

  useEffect(() => {
    if (!unlocked) return;
    fetch('/data/pravachan.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { pravachans: [] }))
      .then(setLib)
      .catch(() => setLib({ pravachans: [] }));
  }, [unlocked]);

  const all = useMemo(() => (lib ? flatten(lib.pravachans) : []), [lib]);

  // Jump to (and flash) the item opened from a search result
  useEffect(() => {
    if (!lib || !id || !itemKey) return;
    const el = document.getElementById(`pv-${itemKey}`);
    if (el) {
      el.scrollIntoView({ block: 'start' });
      el.classList.add('flash');
      const tm = setTimeout(() => el.classList.remove('flash'), 1600);
      return () => clearTimeout(tm);
    }
  }, [lib, id, itemKey]);

  if (!unlocked) return <Gate title={t('pravachanTitle')} onUnlock={() => setUnlocked(true)} />;
  if (!lib) return <div className="center-msg">{t('loading')}</div>;

  const pravachans = lib.pravachans;
  const current = id && pravachans.find((p) => p.id === id);

  if (current) {
    return (
      <article className="pv">
        <a className="pv-back" href="#/pravachan">← {t('pravachanBack')}</a>
        <p className="pv-kicker">{current.subject}</p>
        <h1>{current.title}</h1>
        {current.subtitle && <p className="pv-subtitle">{current.subtitle}</p>}
        <p className="pv-meta">
          {[current.kind, current.date, current.duration && `${t('pravachanTime')} ${current.duration}`].filter(Boolean).join(' · ')}
        </p>
        {current.sections.map((s, si) => (
          <section key={si} className="pv-section">
            {s.heading && <h2>{s.heading}</h2>}
            {s.items.map((it, ii) => {
              const key = `${si}-${ii}`;
              if (it.type === 'prasang')
                return (
                  <div key={key} id={`pv-${key}`} className="pv-prasang">
                    <h3>{it.title}</h3>
                    {paragraphs(it.text).map((x, i) => <p key={i}>{x}</p>)}
                  </div>
                );
              if (it.type === 'quote')
                return (
                  <blockquote key={key} id={`pv-${key}`} className="pv-quote">
                    {paragraphs(it.text).map((x, i) => <p key={i}>{x}</p>)}
                  </blockquote>
                );
              return <p key={key} id={`pv-${key}`} className="pv-p">{it.text}</p>;
            })}
          </section>
        ))}
        {current.source && <p className="pv-source">{t('praptiSource')} {current.source}</p>}
      </article>
    );
  }

  const subjects = [...new Set(pravachans.map((p) => p.subject))];
  const terms = norm(query).split(/\s+/).filter(Boolean);
  const inSubject = (p) => subject === 'all' || p.subject === subject;
  const results = terms.length
    ? all.filter(
        (r) =>
          inSubject(r.p) &&
          (!prasangOnly || r.item.type === 'prasang') &&
          terms.every((x) => r.hay.includes(x) || norm(`${r.p.title} ${r.p.subject}`).includes(x))
      )
    : [];
  const prasangList = !terms.length && prasangOnly ? all.filter((r) => inSubject(r.p) && r.item.type === 'prasang') : [];
  const prasangCount = (p) => p.sections.reduce((a, s) => a + s.items.filter((i) => i.type === 'prasang').length, 0);

  const ResultRow = ({ r }) => (
    <a className="pv-result" href={`#/pravachan/${r.p.id}/${r.key}`}>
      <small>{[r.p.subject, r.p.title, r.section.heading].filter(Boolean).join(' › ')}</small>
      {r.item.title && <strong><Highlight text={r.item.title} terms={terms} /></strong>}
      <span><Highlight text={snippet(r.item.text, terms)} terms={terms} /></span>
    </a>
  );

  return (
    <div className="pv">
      <h1>{t('pravachanTitle')}</h1>
      <input
        className="search pv-search"
        type="search"
        placeholder={t('pravachanSearch')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="chips" role="tablist" aria-label={t('pickSubject')}>
        <button className={subject === 'all' ? 'chip on' : 'chip'} onClick={() => setSubject('all')}>{t('all')}</button>
        {subjects.map((s) => (
          <button key={s} className={subject === s ? 'chip on' : 'chip'} onClick={() => setSubject(s)}>{s}</button>
        ))}
        <button className={prasangOnly ? 'chip on' : 'chip'} onClick={() => setPrasangOnly((v) => !v)}>
          {t('pravachanPrasangOnly')}
        </button>
      </div>

      {terms.length ? (
        <section className="pv-results">
          <p className="pv-meta">{results.length ? t('pravachanResults', { n: num(results.length) }) : t('pravachanNoResults')}</p>
          {results.map((r) => <ResultRow key={`${r.p.id}-${r.key}`} r={r} />)}
        </section>
      ) : prasangOnly ? (
        <section className="pv-results">
          <p className="pv-meta">{t('pravachanPrasangs', { n: num(prasangList.length) })}</p>
          {prasangList.map((r) => <ResultRow key={`${r.p.id}-${r.key}`} r={r} />)}
        </section>
      ) : (
        subjects
          .filter((s) => subject === 'all' || s === subject)
          .map((s) => (
            <section key={s} className="pv-subject">
              <h2>{s}</h2>
              <div className="grid">
                {pravachans
                  .filter((p) => p.subject === s)
                  .map((p) => (
                    <a key={p.id} className="card" href={`#/pravachan/${p.id}`}>
                      <div className="card-top"><span className="card-sec">{p.kind}</span></div>
                      <h3>{p.title}</h3>
                      {p.subtitle && <p className="card-meta">{p.subtitle}</p>}
                      <p className="card-range">{t('pravachanPrasangs', { n: num(prasangCount(p)) })}{p.date ? ` · ${p.date}` : ''}</p>
                      <span className="card-cta">{t('pravachanRead')}</span>
                    </a>
                  ))}
              </div>
            </section>
          ))
      )}
    </div>
  );
}
