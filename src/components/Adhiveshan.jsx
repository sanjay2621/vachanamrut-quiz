import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../i18n.js';
import { norm, Highlight, snippet, searchTerms, matchesAll } from '../textSearch.jsx';

// અધિવેશન પ્રસંગ section (#/adhiveshan, #/adhiveshan/<n>): the 100 Satsang Prasang of
// North America Adhiveshan 2025, copied from anirdesh.com by `npm run build-adhiveshan`
// into public/data/adhiveshan.json (gu) and adhiveshan.en.json (en):
// { categories: [{ name, nos }], prasangs: [{ n, cat, title, paras }] }.
const DATA_URL = { gu: '/data/adhiveshan.json', en: '/data/adhiveshan.en.json' };

export default function Adhiveshan({ n }) {
  const { t, num, lang } = useLang();
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setData(null);
    fetch(DATA_URL[lang])
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && setData(d || { categories: [], prasangs: [] }))
      .catch(() => !cancelled && setData({ categories: [], prasangs: [] }));
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const index = useMemo(
    () => (data ? data.prasangs.map((p) => ({ p, hay: norm(`${p.title} ${p.paras.join(' ')}`) })) : []),
    [data]
  );

  if (!data) return <div className="center-msg">{t('loading')}</div>;
  const byN = new Map(data.prasangs.map((p) => [p.n, p]));
  const current = n && byN.get(Number(n));

  if (current) {
    const prev = byN.get(current.n - 1);
    const next = byN.get(current.n + 1);
    const fmt = lang === 'gu' ? 'Guj' : 'Eng';
    return (
      <article className="pv adh">
        <a className="pv-back" href="#/adhiveshan">← {t('adhAll')}</a>
        <p className="pv-kicker">{t('adhNumber', { n: num(current.n) })} · {data.categories[current.cat]?.name}</p>
        <h1>{current.title}</h1>
        {current.paras.map((x, i) => (
          <p key={i} className="pv-p">{x}</p>
        ))}
        <nav className="adh-nav">
          {prev ? <a className="btn btn-ghost" href={`#/adhiveshan/${prev.n}`}>← {num(prev.n)}. {prev.title}</a> : <span />}
          {next && <a className="btn btn-ghost" href={`#/adhiveshan/${next.n}`}>{num(next.n)}. {next.title} →</a>}
        </nav>
        <p className="pv-source">
          {t('praptiSource')}{' '}
          <a href={`${data.sourceUrl}?prasang=${current.n}&format=${fmt}`} target="_blank" rel="noreferrer">{data.source}</a>
        </p>
      </article>
    );
  }

  const terms = searchTerms(query);
  const inCat = (p) => cat === 'all' || p.cat === cat;
  const results = terms.length ? index.filter((r) => inCat(r.p) && matchesAll(r.hay, terms)) : [];

  return (
    <div className="pv adh">
      <p className="pv-kicker">{t('adhKicker')}</p>
      <h1>{t('adhTitle')}</h1>
      <p className="pv-meta">{t('adhIntro', { n: num(data.prasangs.length) })}</p>
      <input
        className="search pv-search"
        type="search"
        placeholder={t('adhSearch')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="chips" role="tablist" aria-label={t('adhCategories')}>
        <button className={cat === 'all' ? 'chip on' : 'chip'} onClick={() => setCat('all')}>{t('all')}</button>
        {data.categories.map((c, i) => (
          <button key={i} className={cat === i ? 'chip on' : 'chip'} onClick={() => setCat(i)}>
            {c.name}
            <span className="chip-count">{num(c.nos.length)}</span>
          </button>
        ))}
      </div>

      {terms.length ? (
        <section className="pv-results">
          <p className="pv-meta">{results.length ? t('pravachanResults', { n: num(results.length) }) : t('pravachanNoResults')}</p>
          {results.map(({ p }) => {
            const para = p.paras.find((x) => matchesAll(norm(x), terms)) || p.paras.find((x) => terms.some((w) => norm(x).includes(w))) || p.paras[0];
            return (
              <a key={p.n} className="pv-result" href={`#/adhiveshan/${p.n}`}>
                <small>{t('adhNumber', { n: num(p.n) })} · {data.categories[p.cat]?.name}</small>
                <strong><Highlight text={p.title} terms={terms} /></strong>
                <span><Highlight text={snippet(para, terms)} terms={terms} /></span>
              </a>
            );
          })}
        </section>
      ) : (
        data.categories
          .map((c, i) => ({ c, i }))
          .filter(({ i }) => cat === 'all' || cat === i)
          .map(({ c, i }) => (
            <section key={i} className="pv-subject">
              <h2>{c.name}</h2>
              <ol className="adh-list">
                {c.nos.map((no) => byN.get(no)).filter(Boolean).map((p) => (
                  <li key={p.n}>
                    <a href={`#/adhiveshan/${p.n}`}>
                      <span className="adh-no">{num(p.n)}</span>
                      <span>{p.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          ))
      )}
    </div>
  );
}
