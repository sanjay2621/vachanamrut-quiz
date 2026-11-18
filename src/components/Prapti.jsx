import { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n.js';
import { isPraptiDone, setPraptiDone } from '../storage.js';

const MINUTES = 15;

// Local date as yyyy-mm-dd (not UTC, so the day changes at the user's midnight)
export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Each entry covers from..to (inclusive). Older entries may only have `date`.
const fromOf = (d) => d.from || d.date;
const toOf = (d) => d.to || d.from || d.date;

// Entries newest first
const sortRanges = (days) => [...days].sort((a, b) => fromOf(b).localeCompare(fromOf(a)));

// Entry for a date: the range containing it (or starting on it), else the
// latest one starting before it, else the newest
// Entries with `disabled: true` (content not ready yet) show as a greyed tab and are never opened.
export function pickDay(days, date) {
  const sorted = sortRanges(days).filter((d) => !d.disabled);
  return (
    sorted.find((d) => fromOf(d) <= date && date <= toOf(d)) ||
    sorted.find((d) => fromOf(d) <= date) ||
    sorted[0]
  );
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
  const today = todayKey();
  const day = pickDay(prapti.days, date || today);
  if (!day) return <div className="center-msg">{t('nothingFound')}</div>;
  const ranges = sortRanges(prapti.days);
  const locale = lang === 'gu' ? 'gu-IN' : 'en-GB';
  const fmt = (k, opts) => new Date(`${k}T00:00:00`).toLocaleDateString(locale, opts);
  const rangeLabel = (d, long) => {
    const f = fromOf(d);
    const e = toOf(d);
    const opts = long ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' };
    return f === e ? fmt(f, opts) : `${fmt(f, opts)} – ${fmt(e, opts)}`;
  };
  const isCurrent = (d) => fromOf(d) <= today && today <= toOf(d);
  // Timer completion is per day: today while the range is current, else the range's first day
  const doneKey = isCurrent(day) ? today : fromOf(day);

  return (
    <div className="prapti">
      {ranges.length > 0 && (
        <div className="chips prapti-tabs" role="tablist" aria-label={t('praptiRanges')}>
          {ranges.map((d) => d.disabled ? (
            <span key={fromOf(d)} role="tab" aria-disabled="true" className="chip disabled" title={t('praptiSoon')}>
              {rangeLabel(d, false)} · {t('praptiSoon')}
            </span>
          ) : (
            <a
              key={fromOf(d)}
              role="tab"
              aria-selected={d === day}
              className={d === day ? 'chip on' : 'chip'}
              href={`#/prapti/${fromOf(d)}`}
            >
              {rangeLabel(d, false)}{isCurrent(d) ? ` · ${t('praptiNow')}` : ''}
            </a>
          ))}
        </div>
      )}

      <section className="hero prapti-hero">
        <p className="hero-kicker">{t('praptiKicker')} · {rangeLabel(day, true)}</p>
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

      <Timer key={doneKey} dateKey={doneKey} />

      {day.source && <p className="prapti-source">{t('praptiSource')} {day.source}</p>}
    </div>
  );
}
