import { Fragment, useEffect, useMemo, useState } from 'react';
import { useLang } from '../i18n.js';
import { norm, Highlight, searchTerms, matchesAll } from '../textSearch.jsx';

// વચનામૃત સાંકળી (#/sankali, #/sankali/<themeId>): for each theme ("વાત"), every Vachanamrut
// in which Shriji Maharaj speaks about it, with the Gujarati sentence quoted from the text.
// Built by `npm run build-sankali` into public/data/sankali.json:
// { groups: [{id, gu, en}], themes: [{id, group, subject?, gu, en, re, items: [{no, n, q}]}] }.
// Found automatically from the wording, so the page says so; the quote lets the reader judge.
let cache = null;

// Marks the words the theme was found by
function Marked({ text, re }) {
  const parts = [];
  let last = 0;
  try {
    for (const m of text.matchAll(new RegExp(re, 'g'))) {
      if (!m[0]) continue;
      // Skip a leading separator the "word start" group may have captured
      const lead = m[1] && /^[ ,;“‘(]$/.test(m[1]) ? 1 : 0;
      const at = m.index + lead;
      parts.push(<Fragment key={parts.length}>{text.slice(last, at)}</Fragment>);
      parts.push(<mark key={parts.length}>{m[0].slice(lead)}</mark>);
      last = m.index + m[0].length;
    }
  } catch {
    return text;
  }
  parts.push(<Fragment key={parts.length}>{text.slice(last)}</Fragment>);
  return parts;
}

export default function Sankali({ data, themeId }) {
  const { t, num, lang, link } = useLang();
  const [sk, setSk] = useState(cache);
  const [query, setQuery] = useState('');
  const [sec, setSec] = useState('all');

  useEffect(() => {
    if (cache) return undefined;
    let cancelled = false;
    fetch('/data/sankali.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        cache = d || { groups: [], themes: [] };
        if (!cancelled) setSk(cache);
      })
      .catch(() => !cancelled && setSk({ groups: [], themes: [] }));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSec('all');
    window.scrollTo(0, 0);
  }, [themeId]);

  const byNo = useMemo(() => Object.fromEntries(data.vachanamruts.map((v) => [v.vachno, v])), [data]);
  const name = (x) => (lang === 'gu' ? x.gu : x.en);

  const index = useMemo(
    () =>
      sk
        ? sk.themes.flatMap((th) =>
            th.items.map((it) => ({ th, it, hay: norm(`${it.q} ${byNo[it.no]?.ref || ''} ${byNo[it.no]?.title || ''}`) })),
          )
        : [],
    [sk, byNo],
  );

  if (!sk) return <div className="center-msg">{t('loading')}</div>;
  const theme = themeId && sk.themes.find((x) => x.id === themeId);

  if (theme) {
    const subject = theme.subject && (data.subjects || []).find((s) => s.id === theme.subject);
    const group = sk.groups.find((g) => g.id === theme.group);
    const secs = data.sections.filter((s) => theme.items.some((it) => byNo[it.no]?.section === s.id));
    const items = theme.items.filter((it) => sec === 'all' || byNo[it.no]?.section === sec);
    const related = sk.themes.filter((x) => x.group === theme.group && x.id !== theme.id);
    return (
      <div className="sankali">
        <a href="#/sankali" className="back-link">{t('skAll')}</a>
        <p className="pv-kicker">{group && name(group)}</p>
        <h1 className="page-h">{name(theme)}</h1>
        {lang === 'en' && <p className="subject-alt">{theme.gu}</p>}
        <p className="card-meta">
          {t('nVach', { n: theme.items.length })}
          {subject && (
            <>
              {' · '}
              <a href={`#/subjects/${subject.id}`}>{t('skSubject', { s: subject.name })}</a>
            </>
          )}
        </p>
        <p className="subject-note">{t('skNote')}</p>
        {secs.length > 1 && (
          <div className="chips sk-secs">
            <button type="button" className={sec === 'all' ? 'chip on' : 'chip'} onClick={() => setSec('all')}>
              {t('skAllSecs')} <span className="chip-count">{num(theme.items.length)}</span>
            </button>
            {secs.map((s) => (
              <button key={s.id} type="button" className={sec === s.id ? 'chip on' : 'chip'} onClick={() => setSec(s.id)}>
                {s.name} <span className="chip-count">{num(theme.items.filter((it) => byNo[it.no]?.section === s.id).length)}</span>
              </button>
            ))}
          </div>
        )}
        <ol className="sk-chain">
          {items.map((it) => {
            const v = byNo[it.no];
            return (
              <li key={it.no}>
                <div className="sk-head">
                  <a href={link(it.no)} target="_blank" rel="noreferrer" className="sk-ref">{v?.ref}</a>
                  <span className="sk-title">{v?.title}</span>
                  {it.n > 1 && <span className="chip-count" title={t('skTimesTitle')}>{t('skTimes', { n: num(it.n) })}</span>}
                </div>
                <blockquote className="sk-quote" lang="gu">
                  <Marked text={it.q} re={theme.re} />
                </blockquote>
              </li>
            );
          })}
        </ol>
        {related.length > 0 && (
          <section className="sk-related">
            <h2>{t('skRelated')}</h2>
            <div className="chips">
              {related.map((x) => (
                <a key={x.id} className="chip" href={`#/sankali/${x.id}`}>
                  {name(x)} <span className="chip-count">{num(x.items.length)}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  const terms = searchTerms(query);
  const themeHit = (x) => matchesAll(norm(`${x.gu} ${x.en}`), terms);
  const lines = terms.length ? index.filter((x) => matchesAll(x.hay, terms)) : [];
  const total = sk.themes.reduce((a, x) => a + x.items.length, 0);

  return (
    <div className="sankali">
      <h1 className="page-h">{t('skTitle')}</h1>
      <p className="admin-note">{t('skIntro', { a: num(sk.themes.length), b: num(total) })}</p>
      <input
        className="search"
        type="search"
        placeholder={t('skSearch')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t('skSearch')}
      />
      {sk.groups.map((g) => {
        const list = sk.themes.filter((x) => x.group === g.id && (!terms.length || themeHit(x)));
        if (!list.length) return null;
        return (
          <section key={g.id} className="sk-group">
            <h2>{name(g)}</h2>
            <div className="sk-grid">
              {list.map((x) => (
                <a key={x.id} className="sk-card" href={`#/sankali/${x.id}`}>
                  <strong>{name(x)}</strong>
                  <span className="card-meta">{t('nVach', { n: x.items.length })}</span>
                </a>
              ))}
            </div>
          </section>
        );
      })}
      {terms.length > 0 && (
        <section className="sk-group">
          <h2>{t('skLines', { n: num(lines.length) })}</h2>
          {lines.length === 0 && <p className="center-msg">{t('nothingFound')}</p>}
          <ul className="sk-lines">
            {lines.slice(0, 100).map(({ th, it }) => (
              <li key={`${th.id}-${it.no}`}>
                <a href={`#/sankali/${th.id}`} className="sk-line-theme">{name(th)}</a>
                <span className="sk-ref"> · {byNo[it.no]?.ref}</span>
                <p className="sk-quote" lang="gu"><Highlight text={it.q} terms={terms} /></p>
              </li>
            ))}
          </ul>
          {lines.length > 100 && <p className="admin-note">{t('skMore', { n: num(lines.length - 100) })}</p>}
        </section>
      )}
    </div>
  );
}
