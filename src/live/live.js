// Live multiplayer games (Kahoot-style, host-paced) over Firebase Realtime Database.
// The Firebase SDK is loaded on demand so normal pages don't pay for it.
//
// games/<code>:
//   meta    { hostUid, title, lang, total, limit (s), state: 'lobby'|'question'|'reveal'|'podium',
//             index, startedAt (server ms), answer (revealed index), questions: [{ q, options, ref }] }
//   secret  { answers: [index…] }            readable by the host only
//   players { <uid>: { name, joinedAt } }    each player writes their own entry
//   answers { <qIndex>: { <uid>: { choice, at } } }  once per player, only while that question is open
//   scores  { <uid>: { total, correct, last } }      written by the host on each reveal
import { FIREBASE_CONFIG } from './firebaseConfig.js';

export const liveEnabled = !!FIREBASE_CONFIG;

let ctxPromise = null;

export function live() {
  if (!ctxPromise) {
    ctxPromise = (async () => {
      const [{ initializeApp }, db, { getAuth, signInAnonymously }] = await Promise.all([
        import('firebase/app'),
        import('firebase/database'),
        import('firebase/auth'),
      ]);
      const app = initializeApp(FIREBASE_CONFIG);
      const cred = await signInAnonymously(getAuth(app));
      const database = db.getDatabase(app);
      // Server clock offset, so countdowns agree across devices
      let offset = 0;
      db.onValue(db.ref(database, '.info/serverTimeOffset'), (s) => {
        offset = s.val() || 0;
      });
      const r = (path) => db.ref(database, path);
      return {
        uid: cred.user.uid,
        now: () => Date.now() + offset,
        ref: r,
        get: (path) => db.get(r(path)).then((s) => s.val()),
        set: (path, v) => db.set(r(path), v),
        update: (path, v) => db.update(r(path), v),
        remove: (path) => db.remove(r(path)),
        // Subscribe to a path; returns the unsubscribe function
        watch: (path, cb) => db.onValue(r(path), (s) => cb(s.val())),
        serverTime: db.serverTimestamp,
      };
    })().catch((e) => {
      ctxPromise = null;
      throw e;
    });
  }
  return ctxPromise;
}

// Points for a correct answer: 1000 when instant, down to 500 at the time limit
export const pointsFor = (correct, elapsedMs, limitS) =>
  correct ? Math.round(1000 * (1 - 0.5 * Math.min(1, Math.max(0, elapsedMs) / (limitS * 1000)))) : 0;

// Players sorted by score (then by correct count, then name)
export function ranking(players, scores) {
  return Object.entries(players || {})
    .map(([uid, p]) => ({ uid, name: p.name, ...(scores?.[uid] || { total: 0, correct: 0, last: 0 }) }))
    .sort((a, b) => b.total - a.total || b.correct - a.correct || a.name.localeCompare(b.name));
}
