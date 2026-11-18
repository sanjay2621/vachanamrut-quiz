import { useMemo, useState } from 'react';
import { useLang } from '../i18n.js';
import { getScores } from '../storage.js';

// #/subjects lists all subjects; #/subjects/<id> lists the Vachanamrut tagged with that subject
export default function Subjects({ data, subjectId }) {
  const { t, num, link } = useLang();
  const subjects = data.subjects || [];
  const subject = subjects.find((s) => s.id === subjectId);
  const byNo = useMemo(() => Object.fromEntries(data.vachanamruts.map((v) => [v.vachno, v])), [data]);
  const [term, setTerm] = useState('');
  const scores = useMemo(() => getScores(), []);

  // Hand-entered subjects are exact; only automatically tagged ones get the "approximate" note
  const isAuto = (s) => s.source !== 'manual';

  if (subject) {
    const note = isAuto(subject) && <p className="subject-note">{t('subjectNote')}</p>;
    return (
      <div className="titles">
        <a href="#/subjects" className="back-link">{t('allSubjects')}</a>
        <h1 className="page-h">{subject.name}</h1>
        {subject.alt && <p className="subject-alt">{subject.alt}</p>}
        <p className="card-meta">{t('nVach', { n: subject.vachnos.length })}</p>
        {/* Scored "which Vachanamrut is about this subject?" quizzes (hand-entered subjects only) */}
        {(() => {
          const own = data.quizzes.filter((q) => q.kind === 'subject' && q.subject === subject.id);
          return (
            own.length > 0 && (
              <section className="subject-quizzes">
                <h2>{t('subjectQuizzes')}</h2>
                <div className="grid">
                  {own.map((q) => {
                    const sc = scores[q.id];
                    return (
                      <a key={q.id} href={`#/quiz/${q.id}`} className="card subject-card">
                        <div className="card-top">
                          <span className="card-sec">{subject.name}</span>
                          {sc && <span className={`badge ${sc.best >= 80 ? 'good' : sc.best >= 50 ? 'ok' : 'low'}`}>{num(sc.best)}%</span>}
                        </div>
                        <h3>{q.title.split('—')[1]?.trim() || q.title}</h3>
                        <p className="card-meta">{t('cardMeta', { q: q.questions.length, v: q.covers.length })}</p>
                        <span className="card-cta">{sc ? t('playAgainCta') : t('startCta')}</span>
                      </a>
                    );
                  })}
                </div>
              </section>
            )
          );
        })()}
        <div className="hero-actions subject-actions">
          <a className={data.quizzes.some((q) => q.kind === 'subject' && q.subject === subject.id) ? 'btn btn-ghost' : 'btn btn-primary'} href={`#/subject-quiz/${subject.id}`}>
            {t('randomSubjectQuiz')}
          </a>
        </div>
        {note}
        <section className="title-sec">
          <ul>
            {subject.vachnos.map((n) => {
              const v = byNo[n];
              return (
                <li key={n}>
                  <span className="t-ref">{v.ref}</span>
                  <span className="t-title">
                    <a href={link(n)} target="_blank" rel="noreferrer">{v.title}</a>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    );
  }

  const q = term.trim().toLowerCase();
  const list = subjects.filter((s) => !q || s.name.toLowerCase().includes(q) || (s.alt || '').toLowerCase().includes(q));

  return (
    <div className="titles">
      <h1 className="page-h">{t('subjectsTitle')}</h1>
      <input
        className="search"
        type="search"
        placeholder={t('searchSubjects')}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        aria-label={t('searchSubjectsLabel')}
      />
      {subjects.some(isAuto) && <p className="subject-note">{t('subjectNoteList')}</p>}
      <section className="grid">
        {list.map((s) => (
          <a key={s.id} href={`#/subjects/${s.id}`} className="card subject-card">
            <h3>
              {s.name}
              {isAuto(s) && <span className="auto-mark" title={t('autoMarkTitle')}> ≈</span>}
            </h3>
            {s.alt && <p className="subject-alt">{s.alt}</p>}
            <p className="card-meta">{t('nVach', { n: s.vachnos.length })}</p>
            <span className="card-cta">{t('view')}</span>
          </a>
        ))}
      </section>
      {!list.length && <p className="center-msg">{t('nothingFound')}</p>}
    </div>
  );
}
