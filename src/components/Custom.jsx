import { useMemo, useState } from 'react';
import { useLang } from '../i18n.js';
import { norm, searchTerms, matchesAll } from '../textSearch.jsx';
import { customPool, pickQuestions } from '../customQuizzes.js';

// Custom quiz builder, shown inside the admin page: pick any Vachanamrut (all
// questions, hidden quizzes included), question kinds and a size, generate a fixed
// set of questions, preview it and add it as a quiz. The admin page then saves it to
// quiz-config.json (`custom`), switched off until it is enabled there.
export const KINDS = [
  { id: 'quiz', label: 'knowledgeQuiz' },
  { id: 'titles', label: 'titleQuiz' },
  { id: 'topics', label: 'topicQuiz' },
  { id: 'study', label: 'studyQuiz' },
  { id: 'subject', label: 'subjectQuizTab' },
];
const SIZES = [10, 20, 25, 30, 50, 'all'];

export default function Custom({ data, onCreate, busy }) {
  const { t, num } = useLang();
  const [picked, setPicked] = useState(() => new Set());
  const [kinds, setKinds] = useState(KINDS.map((k) => k.id));
  const [count, setCount] = useState(25);
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('all');
  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [draft, setDraft] = useState(null); // generated questions awaiting "add"

  const vByNo = useMemo(() => new Map(data.vachanamruts.map((v) => [v.vachno, v])), [data]);
  const order = useMemo(() => new Map(data.vachanamruts.map((v, i) => [v.vachno, i])), [data]);
  const terms = searchTerms(query);
  const list = data.vachanamruts.filter(
    (v) => (section === 'all' || v.section === section) && (!terms.length || matchesAll(norm(`${v.ref} ${v.title}`), terms))
  );
  const nos = [...picked].sort((a, b) => order.get(a) - order.get(b));
  const pool = customPool(data.quizzes, nos, kinds);

  const change = (fn) => {
    fn();
    setDraft(null);
  };
  const toggle = (no) =>
    change(() =>
      setPicked((prev) => {
        const next = new Set(prev);
        next.has(no) ? next.delete(no) : next.add(no);
        return next;
      })
    );
  const setAll = (vs, on) =>
    change(() =>
      setPicked((prev) => {
        const next = new Set(prev);
        for (const v of vs) on ? next.add(v.vachno) : next.delete(v.vachno);
        return next;
      })
    );
  const toggleKind = (k) => change(() => setKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k])));
  const allListed = list.length > 0 && list.every((v) => picked.has(v.vachno));
  const autoTitle = () => {
    const refs = nos.map((no) => vByNo.get(no)?.ref);
    return `${t('customQuizTab')} — ${refs.slice(0, 3).join(', ')}${refs.length > 3 ? ' …' : ''}`;
  };

  // Saves to GitHub right away (switched on or off); the form resets only on success
  const add = async (enable) => {
    const ok = await onCreate({
      id: `custom-${Date.now().toString(36)}`,
      title: title.trim() || autoTitle(),
      ...(titleEn.trim() ? { titleEn: titleEn.trim() } : {}),
      nos,
      questions: draft.map((q) => q.id),
      created: new Date().toISOString().slice(0, 10),
    }, enable);
    if (!ok) return;
    setPicked(new Set());
    setTitle('');
    setTitleEn('');
    setDraft(null);
  };

  return (
    <section className="custom admin-builder">
      <h2>{t('customTitle')}</h2>
      <p className="admin-note">{t('customIntro')}</p>

      <div className="custom-picked">
        <div className="custom-picked-head">
          <strong>{t('customPicked', { n: num(nos.length) })}</strong>
          {nos.length > 0 && <button type="button" className="chip" onClick={() => change(() => setPicked(new Set()))}>{t('customClear')}</button>}
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
          <p className="admin-note">{t('customNone')}</p>
        )}
      </div>

      <div className="custom-options">
        <div>
          <strong>{t('customTypes')}</strong>
          <div className="chips">
            {KINDS.map((k) => (
              <button key={k.id} type="button" className={kinds.includes(k.id) ? 'chip on' : 'chip'} onClick={() => toggleKind(k.id)}>{t(k.label)}</button>
            ))}
          </div>
        </div>
        <div>
          <strong>{t('customSize')}</strong>
          <div className="chips">
            {SIZES.map((s) => (
              <button key={s} type="button" className={count === s ? 'chip on' : 'chip'} onClick={() => change(() => setCount(s))}>
                {s === 'all' ? t('all') : num(s)}
              </button>
            ))}
          </div>
        </div>
        <label className="custom-field">
          <strong>{t('customName')}</strong>
          <input value={title} placeholder={nos.length ? autoTitle() : ''} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="custom-field">
          <strong>{t('customNameEn')}</strong>
          <input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
        </label>
        <div className="custom-create">
          <span className="admin-note">{nos.length ? t('customAvailable', { n: num(pool.length) }) : ''}</span>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!nos.length || !kinds.length || !pool.length}
            onClick={() => setDraft(pickQuestions(pool, count))}
          >
            {draft ? t('customRegenerate') : t('customGenerate')}
          </button>
          {draft && (
            <>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => add(false)}>{t('customSaveOff')}</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => add(true)}>{t('customSaveOn', { n: num(draft.length) })}</button>
            </>
          )}
        </div>
      </div>

      {draft && (
        <ol className="custom-preview">
          {draft.map((q) => (
            <li key={q.id}>
              <small>{q.ref}</small> {q.question} <em>→ {q.options[q.answer]}</em>
            </li>
          ))}
        </ol>
      )}

      <input className="search pv-search" type="search" placeholder={t('customSearch')} value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="chips" role="tablist" aria-label={t('pickSection')}>
        <button type="button" className={section === 'all' ? 'chip on' : 'chip'} onClick={() => setSection('all')}>{t('all')}</button>
        {data.sections.map((s) => (
          <button type="button" key={s.id} className={section === s.id ? 'chip on' : 'chip'} onClick={() => setSection(s.id)}>{s.name}</button>
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
        {!list.length && <p className="admin-note">{t('pravachanNoResults')}</p>}
      </div>
    </section>
  );
}
