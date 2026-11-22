import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../i18n.js';
import { live, liveEnabled } from '../live/live.js';
import { getAdminToken } from '../storage.js';
import { ghRead, ghWrite } from './Admin.jsx';

// Admin tab (#/enabledisablequizes/suggestions): visitors' keyword/વિષય suggestions for
// Guruhari Ashirwad videos, stored in Firebase `suggestions/<id>` = { video, text, subject?, at }.
// Reading needs this browser's anonymous Firebase id listed under `admins/<uid>: true`
// (set once in the Firebase console). Approve adds the words (and subject) to
// public/data/video-tags.json via GitHub, then deletes the suggestion; Reject deletes it.
const TAGS_PATH = 'public/data/video-tags.json';

export default function Suggestions() {
  const { t, num, lang } = useLang();
  const [uid, setUid] = useState('');
  const [items, setItems] = useState(null); // null = loading, [] = none
  const [denied, setDenied] = useState(false);
  const [videos, setVideos] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [status, setStatus] = useState(null);
  const [edits, setEdits] = useState({}); // id -> edited keyword text

  useEffect(() => {
    fetch('/data/videos.json')
      .then((r) => r.json())
      .then((d) => {
        setVideos(Object.fromEntries(d.videos.map((v) => [v.id, v])));
        setSubjects(d.subjects);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!liveEnabled) return;
    let off = () => {};
    live()
      .then((ctx) => {
        setUid(ctx.uid);
        off = ctx.watch('suggestions', (v) => {
          setDenied(false);
          setItems(Object.entries(v || {}).map(([id, s]) => ({ id, ...s })).sort((a, b) => b.at - a.at));
        });
      })
      .catch(() => {});
    // A permission error shows up as no data at all; flag it after a moment
    const tm = setTimeout(() => setItems((cur) => (cur === null ? (setDenied(true), []) : cur)), 4000);
    return () => {
      off();
      clearTimeout(tm);
    };
  }, []);

  const subjName = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, lang === 'en' ? s.en : s.gu])), [subjects, lang]);

  if (!liveEnabled) return <p className="admin-note">{t('liveNotSetUp')}</p>;

  async function remove(id) {
    const ctx = await live();
    await ctx.remove(`suggestions/${id}`);
  }

  // Bulk cleanup (one multi-path update; rules allow admins to delete each entry)
  async function removeMany(list, confirmKey) {
    if (!list.length || !window.confirm(t(confirmKey, { n: num(list.length) }))) return;
    const ctx = await live();
    await ctx.update('/', Object.fromEntries(list.map((s) => [`suggestions/${s.id}`, null])));
    setStatus({ kind: 'ok', msg: t('sugCleaned', { n: num(list.length) }) });
  }
  const MONTH = 30 * 24 * 60 * 60 * 1000;
  const old = (items || []).filter((s) => Date.now() - s.at > MONTH);

  async function approve(s) {
    const token = getAdminToken();
    if (!token) return setStatus({ kind: 'err', msg: t('adminNeedToken') });
    setStatus({ kind: 'busy', msg: t('adminSaving') });
    try {
      const words = (edits[s.id] ?? s.text)
        .split(/[,،;\n]/)
        .map((w) => w.trim())
        .filter(Boolean);
      const { sha, config } = await ghRead(token, TAGS_PATH, {});
      const cur = config[s.video] || { keywords: [], subjects: [] };
      const next = {
        ...config,
        [s.video]: {
          keywords: [...new Set([...(cur.keywords || []), ...words])],
          subjects: [...new Set([...(cur.subjects || []), ...(s.subject ? [s.subject] : [])])],
        },
      };
      await ghWrite(token, next, sha, `Video tags: ${s.video} (+${words.length})`, TAGS_PATH);
      await remove(s.id);
      setStatus({ kind: 'ok', msg: t('sugApproved') });
    } catch (e) {
      setStatus({ kind: 'err', msg: t('adminSaveFail', { e: e.message }) });
    }
  }

  return (
    <section className="sug-admin">
      <p className="admin-note">{t('sugAdminIntro')}</p>
      {denied && (
        <div className="admin-token">
          <p><strong>{t('sugNotAdmin')}</strong></p>
          <p className="admin-note">{t('sugAddAdmin')}</p>
          {/* An input, so it can be copied despite the site-wide copy block */}
          <input className="sug-uid" readOnly value={uid} onFocus={(e) => e.target.select()} />
        </div>
      )}
      {status && <p className={`admin-status ${status.kind}`}>{status.msg}</p>}
      {items === null && <p className="admin-note">{t('loading')}</p>}
      {items && !denied && !items.length && <p className="admin-note">{t('sugNone')}</p>}
      {items?.map((s) => {
        const v = videos[s.video];
        return (
          <div key={s.id} className="sug-item">
            <a href={`https://www.youtube.com/watch?v=${s.video}`} target="_blank" rel="noreferrer">
              <img src={`https://i.ytimg.com/vi/${s.video}/mqdefault.jpg`} alt="" loading="lazy" />
            </a>
            <div className="sug-body">
              <small>{v ? v.topic || v.title : s.video} · {new Date(s.at).toLocaleString()}</small>
              <input value={edits[s.id] ?? s.text} onChange={(e) => setEdits({ ...edits, [s.id]: e.target.value })} />
              {s.subject && <span className="chip on">{subjName[s.subject] || s.subject}</span>}
              <span className="sug-actions">
                <button type="button" className="btn btn-primary" disabled={status?.kind === 'busy'} onClick={() => approve(s)}>{t('sugApprove')}</button>
                <button type="button" className="btn btn-ghost" onClick={() => window.confirm(t('sugRejectConfirm')) && remove(s.id)}>{t('sugReject')}</button>
              </span>
            </div>
          </div>
        );
      })}
      {items && items.length > 0 && (
        <div className="sug-clean">
          <span className="admin-note">{t('sugCount', { n: num(items.length) })}</span>
          <button type="button" className="chip" disabled={!old.length} onClick={() => removeMany(old, 'sugDeleteOldConfirm')}>
            {t('sugDeleteOld', { n: num(old.length) })}
          </button>
          <button type="button" className="chip" onClick={() => removeMany(items, 'sugDeleteAllConfirm')}>{t('sugDeleteAll')}</button>
        </div>
      )}
    </section>
  );
}
