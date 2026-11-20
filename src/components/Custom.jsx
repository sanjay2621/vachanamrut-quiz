import { useMemo, useState } from 'react';
import { useLang } from '../i18n.js';
import { norm, searchTerms, matchesAll } from '../textSearch.jsx';

// Custom quiz builder (#/custom[/<spec>]): pick any Vachanamrut, question types and a
// size; "Create quiz" opens #/custom-quiz/<spec>, built in App.jsx from the visible
// quizzes' questions about the picked Vachanamrut. Unscored, like practice.
//
// spec = "<vachno.vachno…>~<kind,kind…>~<count|all>", e.g. "14.271.120~quiz,titles~20"
export const KINDS = [
  { id: 'quiz', label: 'knowledgeQuiz' },
  { id: 'titles', label: 'titleQuiz' },
  { id: 'topics', label: 'topicQuiz' },
  { id: 'study', label: 'studyQuiz' },
  { id: 'subject', label: 'subjectQuizTab' },
];
const SIZES = [10, 20, 30, 50, 'all'];

export function parseSpec(spec) {
  const [nos = '', kinds = '', count = '20'] = (spec || '').split('~');
  return {
    nos: nos.split('.').map(Number).filter(Boolean),
    kinds: kinds ? kinds.split(',').filter((k) => KINDS.some((x) => x.id === k)) : KINDS.map((k) => k.id),
    count: count === 'all' ? 'all' : Number(count) || 20,
  };
}
export const makeSpec = ({ nos, kinds, count }) => `${nos.join('.')}~${kinds.join(',')}~${count}`;

// Questions about the picked Vachanamrut from the given quiz kinds, one per question id
export function customPool(quizzes, nos, kinds) {
  const pick = new Set(nos);
  const byId = new Map();
  for (const q of quizzes) {
    if (!kinds.includes(q.kind || 'quiz')) continue;
    for (const x of q.questions) if (pick.has(x.vachno)) byId.set(x.id, x);
  }
  return [...byId.values()];
}

export default function Custom({ data, spec }) {
  const { t, num } = useLang();
  const initial = useMemo(() => parseSpec(spec), [spec]);
  const [picked, setPicked] = useState(() => new Set(initial.nos));
  const [kinds, setKinds] = useState(initial.kinds);
  const [count, setCount] = useState(initial.count);
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('all');

  const vByNo = useMemo(() => new Map(data.vachanamruts.map((v) => [v.vachno, v])), [data]);
  const terms = searchTerms(query);
  const list = data.vachanamruts.filter(
    (v) => (section === 'all' || v.section === section) && (!terms.length || matchesAll(norm(`${v.ref} ${v.title}`), terms))
  );
  // Selection in reading order
  const order = new Map(data.vachanamruts.map((v, i) => [v.vachno, i]));
  const nos = [...picked].sort((a, b) => order.get(a) - order.get(b));
  const available = customPool(data.quizzes, nos, kinds).length;

  const toggle = (no) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(no) ? next.delete(no) : next.add(no);
      return next;
    });
  const setAll = (vs, on) =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const v of vs) on ? next.add(v.vachno) : next.delete(v.vachno);
      return next;
    });
  const toggleKind = (k) => setKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  const href = `#/custom-quiz/${makeSpec({ nos, kinds, count })}`;
  const canCreate = nos.length > 0 && kinds.length > 0 && available > 0;
  const allListed = list.length > 0 && list.every((v) => picked.has(v.vachno));

  return (
    <div className="custom">
      <h1>{t('customTitle')}</h1>
      <p className="pv-meta">{t('customIntro')}</p>

      <section className="custom-picked">
        <div className="custom-picked-head">
          <strong>{t('customPicked', { n: num(nos.length) })}</strong>
          {nos.length > 0 && (
            <button type="button" className="chip" onClick={() => setPicked(new Set())}>{t('customClear')}</button>
          )}
        </div>
        {nos.length > 0 ? (
          <div className="custom-tags">
            {nos.map((no) => (
              <button key={no} type="button" className="chip on" onClick={() => toggle(no)} title={vByNo.get(no)?.title}>
                {vByNo.get(no)?.ref} ✕
              </button>
            ))}
          </div>
        ) : (
          <p className="pv-meta">{t('customNone')}</p>
        )}
      </section>

      <section className="custom-options">
        <div>
          <strong>{t('customTypes')}</strong>
          <div className="chips">
            {KINDS.map((k) => (
              <button key={k.id} type="button" className={kinds.includes(k.id) ? 'chip on' : 'chip'} onClick={() => toggleKind(k.id)}>
                {t(k.label)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <strong>{t('customSize')}</strong>
          <div className="chips">
            {SIZES.map((s) => (
              <button key={s} type="button" className={count === s ? 'chip on' : 'chip'} onClick={() => setCount(s)}>
                {s === 'all' ? t('all') : num(s)}
              </button>
            ))}
          </div>
        </div>
        <div className="custom-create">
          <span className="pv-meta">{nos.length ? t('customAvailable', { n: num(available) }) : ''}</span>
          {canCreate ? (
            <a className="btn btn-primary" href={href}>{t('customCreate')}</a>
          ) : (
            <button type="button" className="btn btn-primary" disabled>{t('customCreate')}</button>
          )}
        </div>
      </section>

      <input
        className="search pv-search"
        type="search"
        placeholder={t('customSearch')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="chips" role="tablist" aria-label={t('pickSection')}>
        <button className={section === 'all' ? 'chip on' : 'chip'} onClick={() => setSection('all')}>{t('all')}</button>
        {data.sections.map((s) => (
          <button key={s.id} className={section === s.id ? 'chip on' : 'chip'} onClick={() => setSection(s.id)}>
            {s.name}
          </button>
        ))}
      </div>
      {list.length > 0 && (
        <button type="button" className="chip custom-all" onClick={() => setAll(list, !allListed)}>
          {allListed ? t('customUnselectShown') : t('customSelectShown', { n: num(list.length) })}
        </button>
      )}
      <div className="custom-list">
        {list.map((v) => (
          <label key={v.vachno} className={picked.has(v.vachno) ? 'admin-row on' : 'admin-row'}>
            <input type="checkbox" checked={picked.has(v.vachno)} onChange={() => toggle(v.vachno)} />
            <strong className="custom-ref">{v.ref}</strong>
            <span>{v.title}</span>
          </label>
        ))}
        {!list.length && <p className="pv-meta">{t('pravachanNoResults')}</p>}
      </div>
    </div>
  );
}
