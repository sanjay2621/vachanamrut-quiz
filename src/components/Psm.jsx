import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../i18n.js';
import { norm, Highlight, snippet, searchTerms, matchesAll } from '../textSearch.jsx';

// PSM જીવનચરિત્ર (#/psm, #/psm/<part>-<n>, #/psm/topic/<topicId>, #/psm/touching): the prasangs of
// "બ્રહ્મસ્વરૂપ શ્રી પ્રમુખસ્વામી મહારાજ" (one book per part), OCRed and proofread from the PDF.
// public/data/psm.json is the index:
//   { parts: [{n, gu, en, from, to, count}], years: [{year, part, gu}], topics: [{id, gu, en}],
//     prasangs: [{id, part, n, year, page, title, topics: [topicId], touching?: 1}] }
// and public/data/psm-<part>.json holds the texts: { "<id>": [paragraph, …] }, fetched on demand.
// Topics and હૃદયસ્પર્શી were assigned by reading each prasang (not by keywords).
let indexCache = null;
const textCache = {};

function loadText(part) {
  if (!textCache[part]) {
    textCache[part] = fetch(`/data/psm-${part}.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return textCache[part];
}

// Same prasang every day for everyone, changing at local midnight
function todayIndex(len) {
  const d = new Date();
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return len ? (days * 7919) % len : 0;
}

export default function Psm({ arg, arg2 }) {
  const { t, num, lang } = useLang();
  const [idx, setIdx] = useState(indexCache);
  const [texts, setTexts] = useState({});
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('all');

  useEffect(() => {
    if (indexCache) return undefined;
    let cancelled = false;
    fetch('/data/psm.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        indexCache = d || { parts: [], years: [], topics: [], prasangs: [] };
        if (!cancelled) setIdx(indexCache);
      })
      .catch(() => !cancelled && setIdx({ parts: [], years: [], topics: [], prasangs: [] }));
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = useMemo(() => new Map((idx?.prasangs || []).map((p) => [p.id, p])), [idx]);
  const current = arg && byId.get(arg);
  const terms = searchTerms(query);

  // Texts: the open prasang's part, or every part while searching
  const needParts = useMemo(() => {
    if (!idx) return [];
    if (current) return [current.part];
    return terms.length ? idx.parts.map((p) => p.n) : [];
  }, [idx, current, terms.length]);
  useEffect(() => {
    let cancelled = false;
    needParts.forEach((part) => {
      if (texts[part]) return;
      loadText(part).then((d) => !cancelled && setTexts((x) => ({ ...x, [part]: d })));
    });
    return () => {
      cancelled = true;
    };
  }, [needParts, texts]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [arg, arg2]);

  const hay = useMemo(() => {
    const m = new Map();
    (idx?.prasangs || []).forEach((p) => {
      const paras = texts[p.part]?.[p.id];
      if (paras) m.set(p.id, norm(`${p.title} ${paras.join(' ')}`));
    });
    return m;
  }, [idx, texts]);

  if (!idx) return <div className="center-msg">{t('loading')}</div>;
  const topicName = (id) => {
    const x = idx.topics.find((tp) => tp.id === id);
    return x ? (lang === 'gu' ? x.gu : x.en) : id;
  };
  const partOf = (n) => idx.parts.find((p) => p.n === n);
  const partName = (p) => (p ? (lang === 'gu' ? p.gu : p.en) : '');

  if (current) {
    const list = idx.prasangs;
    const i = list.indexOf(current);
    const prev = list[i - 1];
    const next = list[i + 1];
    const paras = texts[current.part]?.[current.id];
    return (
      <article className="pv psm">
        <a className="pv-back" href="#/psm">← {t('psmAll')}</a>
        <p className="pv-kicker">
          {t('psmPart', { n: num(current.part) })} · {num(current.year)}
          {current.touching ? <span className="psm-heart" title={t('psmTouching')}> ♥ {t('psmTouching')}</span> : null}
        </p>
        <h1>{current.title}</h1>
        <div className="chips psm-tags">
          {current.topics.map((tp) => (
            <a key={tp} className="chip" href={`#/psm/topic/${tp}`}>{topicName(tp)}</a>
          ))}
        </div>
        {paras ? (
          paras.map((x, k) => (
            <p key={k} className="pv-p" lang="gu">{x}</p>
          ))
        ) : (
          <div className="center-msg">{t('loading')}</div>
        )}
        <nav className="adh-nav">
          {prev ? <a className="btn btn-ghost" href={`#/psm/${prev.id}`}>← {prev.title}</a> : <span />}
          {next && <a className="btn btn-ghost" href={`#/psm/${next.id}`}>{next.title} →</a>}
        </nav>
        <p className="pv-source">
          {t('praptiSource')} {partName(partOf(current.part))}, {t('psmPage', { n: num(current.page) })}
        </p>
      </article>
    );
  }

  // List: filtered by route (topic / touching), year chips and search
  const topic = arg === 'topic' ? arg2 : null;
  const touchingOnly = arg === 'touching';
  const base = idx.prasangs.filter((p) => (!topic || p.topics.includes(topic)) && (!touchingOnly || p.touching));
  const shown = base.filter((p) => year === 'all' || p.year === year);
  const searching = terms.length > 0;
  const loadingText = searching && needParts.some((part) => !texts[part]);
  const results = searching
    ? shown.filter((p) => (hay.has(p.id) ? matchesAll(hay.get(p.id), terms) : matchesAll(norm(p.title), terms)))
    : [];
  const touching = idx.prasangs.filter((p) => p.touching);
  const today = touching[todayIndex(touching.length)];
  const count = (f) => idx.prasangs.filter(f).length;
  const years = idx.years.filter((y) => base.some((p) => p.year === y.year));

  return (
    <div className="pv psm">
      <p className="pv-kicker">{idx.parts.map(partName).join(' · ')}</p>
      <h1>{topic ? topicName(topic) : touchingOnly ? t('psmTouchingTitle') : t('psmTitle')}</h1>
      <p className="pv-meta">
        {topic || touchingOnly
          ? t('psmFiltered', { n: num(base.length) })
          : t('psmIntro', { n: num(idx.prasangs.length), a: num(touching.length) })}
      </p>
      {(topic || touchingOnly) && <a className="pv-back" href="#/psm">← {t('psmAll')}</a>}

      {!topic && !touchingOnly && today && (
        <a className="psm-today" href={`#/psm/${today.id}`}>
          <small>♥ {t('psmToday')}</small>
          <strong>{today.title}</strong>
          <span>{today.topics.map(topicName).join(' · ')}</span>
        </a>
      )}

      <input
        className="search pv-search"
        type="search"
        placeholder={t('psmSearch')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t('psmSearch')}
      />

      <div className="chips psm-topics" aria-label={t('psmTopics')}>
        <a className={touchingOnly ? 'chip on' : 'chip psm-touch'} href={touchingOnly ? '#/psm' : '#/psm/touching'}>
          ♥ {t('psmTouching')} <span className="chip-count">{num(touching.length)}</span>
        </a>
        {idx.topics.map((tp) => (
          <a key={tp.id} className={topic === tp.id ? 'chip on' : 'chip'} href={topic === tp.id ? '#/psm' : `#/psm/topic/${tp.id}`}>
            {lang === 'gu' ? tp.gu : tp.en}
            <span className="chip-count">{num(count((p) => p.topics.includes(tp.id)))}</span>
          </a>
        ))}
      </div>
      {years.length > 1 && (
        <div className="chips psm-years">
          <button type="button" className={year === 'all' ? 'chip on' : 'chip'} onClick={() => setYear('all')}>{t('all')}</button>
          {years.map((y) => (
            <button key={y.year} type="button" className={year === y.year ? 'chip on' : 'chip'} onClick={() => setYear(y.year)}>
              {num(y.year)} <span className="chip-count">{num(base.filter((p) => p.year === y.year).length)}</span>
            </button>
          ))}
        </div>
      )}
      <p className="subject-note">{t('psmNote')}</p>

      {searching ? (
        <section className="pv-results">
          <p className="pv-meta">
            {loadingText ? t('loading') : results.length ? t('pravachanResults', { n: num(results.length) }) : t('pravachanNoResults')}
          </p>
          {results.slice(0, 200).map((p) => {
            const paras = texts[p.part]?.[p.id] || [];
            const para = paras.find((x) => matchesAll(norm(x), terms)) || paras.find((x) => terms.some((w) => norm(x).includes(w))) || paras[0] || '';
            return (
              <a key={p.id} className="pv-result" href={`#/psm/${p.id}`}>
                <small>{num(p.year)} · {p.topics.map(topicName).join(' · ')}</small>
                <strong>{p.touching ? '♥ ' : ''}<Highlight text={p.title} terms={terms} /></strong>
                <span lang="gu"><Highlight text={snippet(para, terms)} terms={terms} /></span>
              </a>
            );
          })}
        </section>
      ) : (
        years
          .filter((y) => year === 'all' || y.year === year)
          .map((y) => (
            <section key={y.year} className="pv-subject">
              <h2>{num(y.year)} <span className="psm-chapter">— {y.gu}</span></h2>
              <ol className="adh-list">
                {shown.filter((p) => p.year === y.year).map((p) => (
                  <li key={p.id}>
                    <a href={`#/psm/${p.id}`}>
                      <span className="adh-no">{num(p.n)}</span>
                      <span className="psm-item">
                        <span>{p.title}{p.touching ? <span className="psm-heart" title={t('psmTouching')}> ♥</span> : null}</span>
                        <small>{p.topics.map(topicName).join(' · ')}</small>
                      </span>
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
