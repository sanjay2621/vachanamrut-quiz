import { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n.js';
import { isPraptiDone, setPraptiDone } from '../storage.js';

const MINUTES = 15;

// Local date as yyyy-mm-dd (not UTC, so the day changes at the user's midnight)
export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Entry for a date: exact match, else the latest one on or before it, else the newest
export function pickDay(days, date) {
  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date));
  return sorted.find((d) => d.date === date) || sorted.find((d) => d.date <= date) || sorted[0];
}

function Timer({ dateKey }) {
  const { t, num } = useLang();
  const [left, setLeft] = useState(MINUTES * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(() => isPraptiDone(dateKey));
  const endAt = useRef(null);

  useEffect(() => {
    if (!running) return undefined;
    // Count against a fixed end time so a backgrounded tab doesn't drift
    const id = setInterval(() => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        setRunning(false);
        setDone(true);
        setPraptiDone(dateKey);
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, dateKey]);

  const start = () => {
    endAt.current = Date.now() + left * 1000;
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    setLeft(MINUTES * 60);
  };
  const mm = num(String(Math.floor(left / 60)).padStart(2, '0'));
  const ss = num(String(left % 60).padStart(2, '0'));
  const pct = 100 - (left / (MINUTES * 60)) * 100;

  return (
    <section className="prapti-timer">
      <div className="timer-face" style={{ '--pct': `${pct}%` }}>
        <strong>{mm}:{ss}</strong>
        <small>{t('praptiMinutes', { n: MINUTES })}</small>
      </div>
      <div className="timer-actions">
        {!running ? (
          <button className="btn btn-primary" onClick={start} disabled={left === 0}>
            {left === MINUTES * 60 ? t('praptiStart') : t('praptiResume')}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setRunning(false)}>{t('praptiPause')}</button>
        )}
        <button className="btn btn-ghost" onClick={reset}>{t('praptiReset')}</button>
      </div>
      {done && <p className="prapti-done">{t('praptiDoneMsg')}</p>}
    </section>
  );
}

export default function Prapti({ prapti, date }) {
  const { t, lang } = useLang();
  if (!prapti) return <div className="center-msg">{t('loading')}</div>;
  const key = date || todayKey();
  const day = pickDay(prapti.days, key);
  if (!day) return <div className="center-msg">{t('nothingFound')}</div>;
  const others = [...prapti.days].filter((d) => d.date !== day.date).sort((a, b) => b.date.localeCompare(a.date));
  const dateLabel = new Date(`${day.date}T00:00:00`).toLocaleDateString(lang === 'gu' ? 'gu-IN' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="prapti">
      <section className="hero prapti-hero">
        <p className="hero-kicker">{t('praptiKicker')} · {dateLabel}</p>
        {day.series && <p className="prapti-series">{day.series}</p>}
        <h1>{day.title}</h1>
        {day.subtitle && <p className="hero-sub">{day.subtitle}</p>}
      </section>

      {lang !== 'gu' && <p className="subject-note">{t('praptiGuOnly')}</p>}
      {day.intro && <p className="prapti-intro">{day.intro}</p>}

      <h2 className="prapti-h">{t('praptiPrasangs')}</h2>
      <ol className="prasangs">
        {day.prasangs.map((p, i) => (
          <li key={i} className="prasang">
            <h3>{p.title}</h3>
            <p>{p.text}</p>
            {p.lesson && <p className="prasang-lesson">{p.lesson}</p>}
          </li>
        ))}
      </ol>

      <h2 className="prapti-h">{t('praptiVichar')}</h2>
      <p className="subject-note">{t('praptiHow', { n: MINUTES })}</p>
      <ul className="vichar-list">
        {day.vichar.map((v, i) => <li key={i}>{v}</li>)}
      </ul>

      <Timer key={day.date} dateKey={day.date} />

      {day.source && <p className="prapti-source">{t('praptiSource')} {day.source}</p>}

      {others.length > 0 && (
        <section className="prapti-archive">
          <h2 className="prapti-h">{t('praptiArchive')}</h2>
          <ul>
            {others.map((d) => (
              <li key={d.date}><a href={`#/prapti/${d.date}`}>{d.date} — {d.title}</a></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
