import { useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../i18n.js';
import { live, liveEnabled, pointsFor, ranking } from '../live/live.js';
import { shuffle } from '../customQuizzes.js';
import Podium from './Podium.jsx';

// Host screen of a live game (admin page tab #/enabledisablequizes/live), meant for a big
// screen: pick a quiz → players join with the code on #/live → questions one at a time
// with a countdown → reveal + leaderboard after each → podium. The host computes scores.
const HOST_KEY = 'vachanamrut-quiz:live-host';
const LIMITS = [10, 20, 30];
const SIZES = [5, 10, 15, 20, 'all'];

export default function LiveHost({ quizzes }) {
  const { t, num, lang } = useLang();
  const [code, setCode] = useState(() => {
    try {
      return sessionStorage.getItem(HOST_KEY) || '';
    } catch {
      return '';
    }
  });
  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState({});
  const [answers, setAnswers] = useState({});
  const [scores, setScores] = useState({});
  const [secret, setSecret] = useState(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(0);
  const ctxRef = useRef(null);
  const revealed = useRef(new Set());

  // Setup form
  const [quizId, setQuizId] = useState('');
  const [size, setSize] = useState(10);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');

  // Follow the game while one is open
  useEffect(() => {
    if (!code || !liveEnabled) return;
    let offs = [];
    let cancelled = false;
    live()
      .then(async (ctx) => {
        if (cancelled) return;
        ctxRef.current = ctx;
        const base = `games/${code}`;
        offs = [
          ctx.watch(`${base}/meta`, (m) => {
            if (m && m.hostUid !== ctx.uid) return setError(t('liveNotHost'));
            setMeta(m);
            if (!m) endLocal();
          }),
          ctx.watch(`${base}/players`, (v) => setPlayers(v || {})),
          ctx.watch(`${base}/answers`, (v) => setAnswers(v || {})),
          ctx.watch(`${base}/scores`, (v) => setScores(v || {})),
        ];
        setSecret(await ctx.get(`${base}/secret`));
      })
      .catch((e) => setError(t('liveError', { e: e.message })));
    return () => {
      cancelled = true;
      offs.forEach((off) => off());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Countdown tick during a question
  useEffect(() => {
    if (meta?.state !== 'question') return;
    const id = setInterval(() => setNow(ctxRef.current?.now() || Date.now()), 250);
    return () => clearInterval(id);
  }, [meta?.state, meta?.index]);

  const playerCount = Object.keys(players).length;
  const current = meta?.state === 'question' ? answers[meta.index] || {} : {};
  const answeredCount = Object.keys(current).length;
  const remaining = meta?.state === 'question' && meta.startedAt ? Math.max(0, meta.limit * 1000 - (now - meta.startedAt)) : 0;

  // Close the question when time is up or everyone has answered
  useEffect(() => {
    if (meta?.state !== 'question' || !secret || !now) return;
    if (remaining <= 0 || (playerCount > 0 && answeredCount >= playerCount)) reveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, answeredCount, playerCount, meta?.state]);

  function endLocal() {
    try {
      sessionStorage.removeItem(HOST_KEY);
    } catch {
      /* ignore */
    }
    setCode('');
    setMeta(null);
    setSecret(null);
    revealed.current = new Set();
  }

  const options = useMemo(() => {
    const words = search.trim().toLowerCase();
    return quizzes.filter((q) => !words || q.title.toLowerCase().includes(words));
  }, [quizzes, search]);
  const chosen = quizzes.find((q) => q.id === quizId);

  async function create() {
    setError('');
    try {
      const ctx = await live();
      let c = '';
      for (let tries = 0; tries < 10; tries++) {
        c = String(1000 + Math.floor(Math.random() * 9000));
        if (!(await ctx.get(`games/${c}/meta`))) break;
      }
      const picked = shuffle(chosen.questions).slice(0, size === 'all' ? chosen.questions.length : size);
      await ctx.set(`games/${c}`, {
        meta: {
          hostUid: ctx.uid,
          title: chosen.title,
          lang,
          total: picked.length,
          limit,
          state: 'lobby',
          index: -1,
          createdAt: ctx.serverTime(),
          questions: picked.map((q) => ({ q: q.question, options: q.options, ref: q.ref || '' })),
        },
        secret: { answers: picked.map((q) => q.answer) },
      });
      try {
        sessionStorage.setItem(HOST_KEY, c);
      } catch {
        /* ignore */
      }
      revealed.current = new Set();
      setCode(c);
    } catch (e) {
      setError(t('liveError', { e: e.message }));
    }
  }

  const ask = (index) =>
    ctxRef.current.update(`games/${code}/meta`, { state: 'question', index, startedAt: ctxRef.current.serverTime(), answer: null });

  async function reveal() {
    const i = meta.index;
    if (revealed.current.has(i)) return;
    revealed.current.add(i);
    const answer = secret.answers[i];
    const updates = {};
    for (const uid of Object.keys(players)) {
      const a = (answers[i] || {})[uid];
      const correct = !!a && a.choice === answer;
      const pts = a ? pointsFor(correct, a.at - meta.startedAt, meta.limit) : 0;
      const prev = scores[uid] || { total: 0, correct: 0 };
      updates[`scores/${uid}`] = { total: prev.total + pts, correct: prev.correct + (correct ? 1 : 0), last: pts };
    }
    updates['meta/state'] = 'reveal';
    updates['meta/answer'] = answer;
    await ctxRef.current.update(`games/${code}`, updates);
  }

  async function finish() {
    await ctxRef.current.update(`games/${code}/meta`, { state: 'podium' });
  }

  async function endGame() {
    if (!window.confirm(t('liveEndConfirm'))) return;
    await ctxRef.current.remove(`games/${code}`).catch(() => {});
    endLocal();
  }

  if (!liveEnabled) return <p className="admin-note">{t('liveNotSetUp')}</p>;
  if (error) return <p className="admin-status err">{error}</p>;

  // 1) Setup
  if (!code) {
    return (
      <section className="live-setup">
        <input className="search pv-search" type="search" placeholder={t('liveSearchQuiz')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="live-select" size={8} value={quizId} onChange={(e) => setQuizId(e.target.value)}>
          {options.map((q) => (
            <option key={q.id} value={q.id}>{q.title} ({num(q.questions.length)})</option>
          ))}
        </select>
        <div>
          <strong>{t('customSize')}</strong>
          <div className="chips">
            {SIZES.map((s) => (
              <button key={s} type="button" className={size === s ? 'chip on' : 'chip'} onClick={() => setSize(s)}>{s === 'all' ? t('all') : num(s)}</button>
            ))}
          </div>
        </div>
        <div>
          <strong>{t('liveTimePerQ')}</strong>
          <div className="chips">
            {LIMITS.map((s) => (
              <button key={s} type="button" className={limit === s ? 'chip on' : 'chip'} onClick={() => setLimit(s)}>{t('liveSeconds', { n: num(s) })}</button>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-primary" disabled={!chosen} onClick={create}>{t('liveCreate')}</button>
      </section>
    );
  }

  if (!meta) return <div className="center-msg">{t('loading')}</div>;
  const board = ranking(players, scores);
  const q = meta.questions?.[meta.index];
  const joinUrl = `${window.location.origin}/#/live`;

  return (
    <section className="live-host">
      <div className="live-head">
        <span>{meta.title}</span>
        <span className="live-code">{t('liveCodeLabel')} <strong>{code}</strong></span>
        <button type="button" className="chip" onClick={endGame}>{t('liveEnd')}</button>
      </div>

      {meta.state === 'lobby' && (
        <div className="live-lobby">
          <p className="live-join">{t('liveJoinAt')} <strong>{joinUrl}</strong></p>
          <p className="live-bigcode">{code}</p>
          <p className="pv-meta">{t('livePlayers', { n: num(playerCount) })}</p>
          <div className="live-names">
            {Object.values(players).map((p, i) => <span key={i} className="chip on">{p.name}</span>)}
          </div>
          <button type="button" className="btn btn-primary" disabled={!playerCount} onClick={() => ask(0)}>{t('liveStart')}</button>
        </div>
      )}

      {meta.state === 'question' && q && (
        <div className="live-question">
          <div className="live-qhead">
            <span>{t('liveQOf', { a: num(meta.index + 1), b: num(meta.total) })}</span>
            <span className="live-timer">{num(Math.ceil(remaining / 1000))}</span>
            <span>{t('liveAnswered', { a: num(answeredCount), b: num(playerCount) })}</span>
          </div>
          <h2>{q.q}</h2>
          <ol className="live-options">
            {q.options.map((o, i) => <li key={i} className={`live-opt c${i}`}>{o}</li>)}
          </ol>
          <button type="button" className="btn btn-ghost" onClick={reveal}>{t('liveRevealNow')}</button>
        </div>
      )}

      {meta.state === 'reveal' && q && (
        <div className="live-question">
          <div className="live-qhead"><span>{t('liveQOf', { a: num(meta.index + 1), b: num(meta.total) })}</span></div>
          <h2>{q.q}</h2>
          <ol className="live-options">
            {q.options.map((o, i) => {
              const n = Object.values(answers[meta.index] || {}).filter((a) => a.choice === i).length;
              return (
                <li key={i} className={`live-opt c${i} ${i === meta.answer ? 'right' : 'dim'}`}>
                  {o} <span className="live-count">{num(n)}</span>
                </li>
              );
            })}
          </ol>
          <ol className="live-board">
            {board.slice(0, 5).map((p) => (
              <li key={p.uid}><span>{p.name}</span><strong>{num(p.total)}</strong></li>
            ))}
          </ol>
          {meta.index + 1 < meta.total ? (
            <button type="button" className="btn btn-primary" onClick={() => ask(meta.index + 1)}>{t('liveNext')}</button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={finish}>{t('liveShowPodium')}</button>
          )}
        </div>
      )}

      {meta.state === 'podium' && <Podium board={board} />}
    </section>
  );
}
