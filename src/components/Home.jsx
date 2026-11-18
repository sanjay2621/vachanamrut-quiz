import { useMemo, useState } from 'react';
import { getScores } from '../storage.js';

const toGu = (n) => String(n).replace(/\d/g, (d) => '૦૧૨૩૪૫૬૭૮૯'[d]);

export default function Home({ data, mode = 'quiz' }) {
  const [section, setSection] = useState('all');
  const scores = useMemo(() => getScores(), []);

  const isTitles = mode === 'titles';
  const quizzes = data.quizzes.filter((q) => (q.kind === 'titles') === isTitles);
  const titleQuizCount = data.quizzes.filter((q) => q.kind === 'titles').length;
  const totalQ = quizzes.reduce((a, q) => a + q.questions.length, 0);
  const done = quizzes.filter((q) => scores[q.id]).length;
  const visible = quizzes.filter((q) => section === 'all' || q.section === section);
  const secById = Object.fromEntries(data.sections.map((s) => [s.id, s]));
  const refByNo = Object.fromEntries(data.vachanamruts.map((v) => [v.vachno, v.ref]));

  return (
    <>
      <section className="hero">
        <p className="hero-kicker">॥ ભગવાન સ્વામિનારાયણનાં વચનામૃત ॥</p>
        <h1>વચનામૃત જ્ઞાન ક્વિઝ</h1>
        <p className="hero-sub">
          {isTitles
            ? `દરેક પ્રકરણના દરેક વચનામૃતનું શીર્ષક ઓળખો — ${toGu(262)} વચનામૃત, દરેકનો એક પ્રશ્ન.`
            : `${toGu(262)} વચનામૃતનાં શીર્ષક, તિથિ, ઉપદેશ અને પ્રશ્નકર્તા પર આધારિત બહુવિકલ્પ પ્રશ્નો.`}
        </p>
        <div className="stats">
          <div><strong>{toGu(262)}</strong><span>વચનામૃત</span></div>
          <div><strong>{toGu(quizzes.length)}</strong><span>ક્વિઝ</span></div>
          <div><strong>{toGu(totalQ)}</strong><span>પ્રશ્નો</span></div>
          <div><strong>{toGu(done)}</strong><span>પૂર્ણ</span></div>
        </div>
        <div className="hero-actions">
          {!isTitles && (
            <a className="btn btn-primary" href={`#/practice/${section}`}>
              ઝડપી અભ્યાસ (૨૦ પ્રશ્નો)
            </a>
          )}
          <a className="btn btn-ghost" href="#/titles">વચનામૃત સૂચિ જુઓ</a>
        </div>
        <div className="overall">
          <div className="overall-bar"><span style={{ width: `${(done / quizzes.length) * 100}%` }} /></div>
          <small>કુલ પ્રગતિ: {toGu(done)} / {toGu(quizzes.length)} ક્વિઝ</small>
        </div>
      </section>

      <nav className="modes" aria-label="ક્વિઝ પ્રકાર">
        <a className={!isTitles ? 'mode on' : 'mode'} aria-current={!isTitles ? 'page' : undefined} href="#/">
          જ્ઞાન ક્વિઝ
        </a>
        <a className={isTitles ? 'mode on' : 'mode'} aria-current={isTitles ? 'page' : undefined} href="#/home/titles">
          શીર્ષક ક્વિઝ
          <span className="chip-count">{toGu(titleQuizCount)}</span>
        </a>
      </nav>

      <div className="chips" role="tablist" aria-label="પ્રકરણ પસંદ કરો">
        <button role="tab" aria-selected={section === 'all'} className={section === 'all' ? 'chip on' : 'chip'} onClick={() => setSection('all')}>
          બધા
        </button>
        {data.sections.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={section === s.id}
            className={section === s.id ? 'chip on' : 'chip'}
            onClick={() => setSection(s.id)}
          >
            {s.name}
            <span className="chip-count">{toGu(s.to - s.from + 1)}</span>
          </button>
        ))}
      </div>

      <section className="grid">
        {visible.map((q) => {
          const sc = scores[q.id];
          const sec = secById[q.section];
          return (
            <a key={q.id} href={`#/quiz/${q.id}`} className={`card sec-${q.section}`}>
              <div className="card-top">
                <span className="card-sec">{sec.name}</span>
                {sc && <span className={`badge ${sc.best >= 80 ? 'good' : sc.best >= 50 ? 'ok' : 'low'}`}>{toGu(sc.best)}%</span>}
              </div>
              <h3>{q.title.split('—')[1]?.trim() || q.title}</h3>
              <p className="card-meta">
                {toGu(q.questions.length)} પ્રશ્નો · {toGu(q.covers.length)} વચનામૃત
              </p>
              <p className="card-range">
                {refByNo[q.covers[0]]} … {refByNo[q.covers[q.covers.length - 1]]}
              </p>
              <span className="card-cta">{sc ? 'ફરી રમો →' : 'શરૂ કરો →'}</span>
            </a>
          );
        })}
      </section>
    </>
  );
}
