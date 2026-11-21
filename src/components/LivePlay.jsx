import { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n.js';
import { live, liveEnabled, ranking } from '../live/live.js';
import Podium from './Podium.jsx';

// Player screen of a live game (#/live): join with the 4-digit code and a name, then
// answer each question on the phone while the host's screen shows it. Rejoins after a
// reload (code and name kept for the tab session).
const PLAYER_KEY = 'vachanamrut-quiz:live-player';

const readJoined = () => {
  try {
    return JSON.parse(sessionStorage.getItem(PLAYER_KEY)) || null;
  } catch {
    return null;
  }
};

export default function LivePlay() {
  const { t, num } = useLang();
  const [joined, setJoined] = useState(readJoined); // { code, name }
  const [codeInput, setCodeInput] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState(null);
  const [players, setPlayers] = useState({});
  const [scores, setScores] = useState({});
  const [mine, setMine] = useState({}); // qIndex -> choice
  const [now, setNow] = useState(0);
  const ctxRef = useRef(null);

  useEffect(() => {
    if (!joined || !liveEnabled) return;
    let offs = [];
    let cancelled = false;
    live()
      .then((ctx) => {
        if (cancelled) return;
        ctxRef.current = ctx;
        const base = `games/${joined.code}`;
        offs = [
          ctx.watch(`${base}/meta`, (m) => {
            setMeta(m);
            if (!m) leave(t('liveGameOver'));
          }),
          ctx.watch(`${base}/players`, (v) => setPlayers(v || {})),
          ctx.watch(`${base}/scores`, (v) => setScores(v || {})),
        ];
      })
      .catch((e) => setError(t('liveError', { e: e.message })));
    return () => {
      cancelled = true;
      offs.forEach((off) => off());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  useEffect(() => {
    if (meta?.state !== 'question') return;
    const id = setInterval(() => setNow(ctxRef.current?.now() || Date.now()), 250);
    return () => clearInterval(id);
  }, [meta?.state, meta?.index]);

  function leave(msg = '') {
    try {
      sessionStorage.removeItem(PLAYER_KEY);
    } catch {
      /* ignore */
    }
    setJoined(null);
    setMeta(null);
    setMine({});
    setError(msg);
  }

  async function join(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const ctx = await live();
      const code = codeInput.trim();
      const m = await ctx.get(`games/${code}/meta`);
      if (!m) throw new Error(t('liveNoGame'));
      if (m.state === 'podium') throw new Error(t('liveGameOver'));
      await ctx.set(`games/${code}/players/${ctx.uid}`, { name: name.trim().slice(0, 30), joinedAt: ctx.serverTime() });
      const j = { code, name: name.trim() };
      try {
        sessionStorage.setItem(PLAYER_KEY, JSON.stringify(j));
      } catch {
        /* ignore */
      }
      setJoined(j);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function answer(choice) {
    const i = meta.index;
    if (mine[i] !== undefined) return;
    setMine((prev) => ({ ...prev, [i]: choice }));
    try {
      await ctxRef.current.set(`games/${joined.code}/answers/${i}/${ctxRef.current.uid}`, { choice, at: ctxRef.current.serverTime() });
    } catch {
      setError(t('liveTooLate'));
    }
  }

  if (!liveEnabled) return <div className="center-msg">{t('liveNotSetUp')}</div>;

  if (!joined) {
    return (
      <form className="admin-gate live-joinform" onSubmit={join}>
        <h1>{t('liveJoinTitle')}</h1>
        <label htmlFor="live-code">{t('liveCodeLabel')}</label>
        <input id="live-code" inputMode="numeric" autoComplete="off" maxLength={4} value={codeInput} onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))} />
        <label htmlFor="live-name">{t('liveYourName')}</label>
        <input id="live-name" autoComplete="off" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
        {error && <p className="admin-error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy || codeInput.length !== 4 || !name.trim()}>{t('liveJoin')}</button>
      </form>
    );
  }

  if (!meta) return <div className="center-msg">{error || t('loading')}</div>;
  const uid = ctxRef.current?.uid;
  const board = ranking(players, scores);
  const myRank = board.findIndex((p) => p.uid === uid) + 1;
  const me = scores[uid] || { total: 0, last: 0 };
  const q = meta.questions?.[meta.index];
  const remaining = meta.state === 'question' && meta.startedAt && now ? Math.max(0, meta.limit * 1000 - (now - meta.startedAt)) : null;

  return (
    <section className="live-play">
      <div className="live-head">
        <span>{joined.name}</span>
        <span>{t('liveScore', { n: num(me.total) })}</span>
      </div>

      {meta.state === 'lobby' && (
        <div className="live-wait">
          <h2>{meta.title}</h2>
          <p>{t('liveWaiting')}</p>
          <p className="pv-meta">{t('livePlayers', { n: num(Object.keys(players).length) })}</p>
        </div>
      )}

      {meta.state === 'question' && q && (
        <div className="live-question">
          <div className="live-qhead">
            <span>{t('liveQOf', { a: num(meta.index + 1), b: num(meta.total) })}</span>
            {remaining !== null && <span className="live-timer">{num(Math.ceil(remaining / 1000))}</span>}
          </div>
          <h2>{q.q}</h2>
          {mine[meta.index] === undefined ? (
            <div className="live-buttons">
              {q.options.map((o, i) => (
                <button key={i} type="button" className={`live-opt c${i}`} disabled={remaining === 0} onClick={() => answer(i)}>{o}</button>
              ))}
            </div>
          ) : (
            <p className="live-sent">{t('liveSent')}</p>
          )}
        </div>
      )}

      {meta.state === 'reveal' && q && (
        <div className="live-wait">
          {mine[meta.index] === undefined ? (
            <p className="live-result bad">{t('liveNoAnswer')}</p>
          ) : mine[meta.index] === meta.answer ? (
            <p className="live-result ok">{t('liveRight', { n: num(me.last) })}</p>
          ) : (
            <p className="live-result bad">{t('liveWrong')}</p>
          )}
          <p>{t('liveCorrectWas')} <strong>{q.options[meta.answer]}</strong></p>
          <p className="live-rank">{t('liveYourRank', { a: num(myRank), b: num(board.length) })}</p>
        </div>
      )}

      {meta.state === 'podium' && <Podium board={board} me={uid} />}
    </section>
  );
}
