import { useMemo, useState } from 'react';
import { getScores } from '../storage.js';
import { useLang } from '../i18n.js';

export default function Home({ data, mode = 'quiz' }) {
  const { t, num } = useLang();
  const [section, setSection] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const scores = useMemo(() => getScores(), []);

  // Quiz kinds: knowledge ('quiz', no kind field), 'titles', 'topics', 'study', 'subject'
  const kindOf = (q) => q.kind || 'quiz';
  const quizzes = data.quizzes.filter((q) => kindOf(q) === mode);
  const countOf = (k) => data.quizzes.filter((q) => kindOf(q) === k).length;
  const ALL_MODES = [
    { id: 'quiz', href: '#/', label: 'knowledgeQuiz', sub: 'heroSubQuiz' },
    { id: 'titles', href: '#/home/titles', label: 'titleQuiz', sub: 'heroSubTitles' },
    { id: 'topics', href: '#/home/topics', label: 'topicQuiz', sub: 'heroSubTopics' },
    { id: 'study', href: '#/home/study', label: 'studyQuiz', sub: 'heroSubStudy' },
    { id: 'subject', href: '#/home/subject', label: 'subjectQuizTab', sub: 'heroSubSubject' },
  ];
  // Tabs with no visible quizzes (all switched off on the admin page) are hidden
  const MODES = ALL_MODES.filter((m) => m.id === mode || countOf(m.id) > 0);
  const current = MODES.find((m) => m.id === mode) || MODES[0];
  const totalQ = quizzes.reduce((a, q) => a + q.questions.length, 0);
  const done = quizzes.filter((q) => scores[q.id]).length;
  // Subject quizzes are filtered by subject instead of by section
  const isSubject = mode === 'subject';
  const subjById = Object.fromEntries((data.subjects || []).map((x) => [x.id, x]));
  const quizSubjects = (data.subjects || []).filter((x) => quizzes.some((q) => q.subject === x.id));
  const visible = isSubject
    ? quizzes.filter((q) => subjectFilter === 'all' || q.subject === subjectFilter)
    : quizzes.filter((q) => section === 'all' || q.section === section);
  const secById = Object.fromEntries(data.sections.map((s) => [s.id, s]));
  const refByNo = Object.fromEntries(data.vachanamruts.map((v) => [v.vachno, v.ref]));

  return (
    <>
      <section className="hero">
        <p className="hero-kicker">{t('heroKicker')}</p>
        <h1>{t('heroTitle')}</h1>
        <p className="hero-sub">{t(current.sub, { n: data.vachanamruts.length })}</p>
        <div className="stats">
          <div><strong>{num(data.vachanamruts.length)}</strong><span>{t('statVach')}</span></div>
          <div><strong>{num(quizzes.length)}</strong><span>{t('statQuiz')}</span></div>
          <div><strong>{num(totalQ)}</strong><span>{t('statQuestions')}</span></div>
          <div><strong>{num(done)}</strong><span>{t('statDone')}</span></div>
        </div>
        <div className="hero-actions">
          {mode === 'quiz' && quizzes.length > 0 && (
            <a className="btn btn-primary" href={`#/practice/${section}`}>
              {t('quickPractice')}
            </a>
          )}
          {mode === 'titles' && quizzes.length > 0 && (
            <a className="btn btn-primary" href="#/title-mix">
              {t('titleMix')}
            </a>
          )}
          <a className="btn btn-ghost" href="#/titles">{t('viewList')}</a>
        </div>
        <div className="overall">
          <div className="overall-bar"><span style={{ width: `${quizzes.length ? (done / quizzes.length) * 100 : 0}%` }} /></div>
          <small>{t('progress', { a: done, b: quizzes.length })}</small>
        </div>
      </section>

      <nav className="modes" aria-label={t('quizTypes')}>
        {MODES.map((m) => (
          <a
            key={m.id}
            className={m.id === current.id ? 'mode on' : 'mode'}
            aria-current={m.id === current.id ? 'page' : undefined}
            href={m.href}
          >
            {t(m.label)}
            {m.id !== 'quiz' && <span className="chip-count">{num(countOf(m.id))}</span>}
          </a>
        ))}
      </nav>

      {isSubject ? (
        <div className="chips" role="tablist" aria-label={t('pickSubject')}>
          <button role="tab" aria-selected={subjectFilter === 'all'} className={subjectFilter === 'all' ? 'chip on' : 'chip'} onClick={() => setSubjectFilter('all')}>
            {t('all')}
          </button>
          {quizSubjects.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={subjectFilter === x.id}
              className={subjectFilter === x.id ? 'chip on' : 'chip'}
              onClick={() => setSubjectFilter(x.id)}
            >
              {x.name}
              <span className="chip-count">{num(x.vachnos.length)}</span>
            </button>
          ))}
        </div>
      ) : (
      <div className="chips" role="tablist" aria-label={t('pickSection')}>
        <button role="tab" aria-selected={section === 'all'} className={section === 'all' ? 'chip on' : 'chip'} onClick={() => setSection('all')}>
          {t('all')}
        </button>
        {data.sections.filter((s) => quizzes.some((q) => q.section === s.id)).map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={section === s.id}
            className={section === s.id ? 'chip on' : 'chip'}
            onClick={() => setSection(s.id)}
          >
            {s.name}
            <span className="chip-count">{num(s.count)}</span>
          </button>
        ))}
      </div>
      )}

      {!quizzes.length && <p className="center-msg">{t('noQuizzes')}</p>}
      <section className="grid">
        {visible.map((q) => {
          const sc = scores[q.id];
          // Mixed title quizzes have no section
          const label = isSubject ? subjById[q.subject]?.name : secById[q.section]?.name || t('mixLabel');
          return (
            <a key={q.id} href={`#/quiz/${q.id}`} className={`card sec-${q.section || (isSubject ? 'subject' : 'mix')}`}>
              <div className="card-top">
                <span className="card-sec">{label}</span>
                {sc && <span className={`badge ${sc.best >= 80 ? 'good' : sc.best >= 50 ? 'ok' : 'low'}`}>{num(sc.best)}%</span>}
              </div>
              <h3>{isSubject ? q.title : q.title.split('—')[1]?.trim() || q.title}</h3>
              <p className="card-meta">{t('cardMeta', { q: q.questions.length, v: q.covers.length })}</p>
              <p className="card-range">
                {q.section || isSubject
                  ? `${refByNo[q.covers[0]]} … ${refByNo[q.covers[q.covers.length - 1]]}`
                  : t('mixRange')}
              </p>
              <span className="card-cta">{sc ? t('playAgainCta') : t('startCta')}</span>
            </a>
          );
        })}
      </section>
    </>
  );
}
