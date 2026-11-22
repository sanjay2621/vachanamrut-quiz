import { useEffect, useMemo, useRef, useState } from 'react';
import { useLang } from '../i18n.js';
import { getAdminToken, setAdminToken, isAdminUnlocked, setAdminUnlocked } from '../storage.js';
import Custom from './Custom.jsx';
import LiveHost from './LiveHost.jsx';
import Suggestions from './Suggestions.jsx';
import { buildCustomQuizzes } from '../customQuizzes.js';

// Hidden admin page (#/enabledisablequizes, not linked anywhere): switch quizzes on/off
// for every visitor. The visibility list is public/data/quiz-config.json
// ({ disabled: [baseId…] }); saving commits that file to GitHub with a token kept
// only in this browser, and Vercel redeploys the site.
//
// The access code is only a gate for the page. It is checked in the browser
// against its SHA-256 hash, so the code itself is not in the site files, but this
// is not real security: the GitHub token is what actually protects the data.
export const CODE_HASH = '460d7b810b0ab8e55d8519736ed6d40e651a3392e0a0dc1cc798a332facdcc34';
const REPO = 'sanjay2621/vachanamrut-quiz';
const BRANCH = 'main';
const PATH = 'public/data/quiz-config.json';
const apiFor = (path) => `https://api.github.com/repos/${REPO}/contents/${path}`;

// One switch covers both languages: English quiz ids are the Gujarati ids with "en-"
export const baseId = (id) => id.replace(/^en-/, '');

// GitHub's contents API uses base64; go through UTF-8 bytes so Gujarati titles survive
const toB64 = (text) => {
  let bin = '';
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin);
};
const fromB64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const ghHeaders = (token) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
});

// Read/write a JSON file in the repo (default: the quiz config). Also used for video-tags.json.
export async function ghRead(token, path = PATH, empty = { disabled: [] }) {
  const r = await fetch(`${apiFor(path)}?ref=${BRANCH}`, { headers: ghHeaders(token), cache: 'no-store' });
  if (r.status === 404) return { sha: undefined, config: empty };
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  const j = await r.json();
  return { sha: j.sha, config: JSON.parse(fromB64(j.content.replace(/\n/g, ''))) };
}

export async function ghWrite(token, config, sha, message, path = PATH) {
  const body = {
    message,
    content: toB64(`${JSON.stringify(config, null, 2)}\n`),
    branch: BRANCH,
    ...(sha ? { sha } : {}),
  };
  const r = await fetch(apiFor(path), { method: 'PUT', headers: ghHeaders(token), body: JSON.stringify(body) });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(`GitHub ${r.status}${j.message ? `: ${j.message}` : ''}`);
  }
}

const KINDS = [
  { id: 'quiz', label: 'knowledgeQuiz' },
  { id: 'titles', label: 'titleQuiz' },
  { id: 'topics', label: 'topicQuiz' },
  { id: 'study', label: 'studyQuiz' },
  { id: 'subject', label: 'subjectQuizTab' },
  { id: 'custom', label: 'customQuizTab' },
  { id: 'ramayan', label: 'ramayanTab' },
  { id: 'mahabharat', label: 'mahabharatTab' },
];

export function Gate({ onUnlock, title }) {
  const { t } = useLang();
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const h = await sha256(code);
    if (h === CODE_HASH) {
      setAdminUnlocked(h);
      onUnlock();
    } else {
      setWrong(true);
    }
  };
  return (
    <form className="admin-gate" onSubmit={submit}>
      <h1>{title || t('adminTitle')}</h1>
      <label htmlFor="admin-code">{t('adminCode')}</label>
      <input
        id="admin-code"
        type="password"
        autoComplete="off"
        autoFocus
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setWrong(false);
        }}
      />
      {wrong && <p className="admin-error">{t('adminWrongCode')}</p>}
      <button className="btn btn-primary" type="submit" disabled={!code}>{t('adminUnlock')}</button>
    </form>
  );
}

// Tabs: #/enabledisablequizes (on/off lists) and #/enabledisablequizes/create (builder);
// the pravachan library is a third tab that links to its own page.
export default function Admin({ data, config, onSaved, tab }) {
  const { t, num, lang } = useLang();
  const [unlocked, setUnlocked] = useState(() => isAdminUnlocked(CODE_HASH));
  const [token, setToken] = useState(() => getAdminToken());
  const [tokenInput, setTokenInput] = useState('');
  const [saved, setSaved] = useState(() => new Set(config.disabled || []));
  const [disabled, setDisabled] = useState(() => new Set(config.disabled || []));
  // Custom quizzes made with the builder below (saved in the same config file)
  const [savedCustom, setSavedCustom] = useState(() => config.custom || []);
  const [customs, setCustoms] = useState(() => config.custom || []);
  const [status, setStatus] = useState(null); // { kind: 'ok' | 'err' | 'busy', msg }
  // True while there are changes not yet written to GitHub; a later load from
  // GitHub (e.g. right after pasting the token) must not throw them away
  const dirty = useRef(false);

  // With a token, start from the file on GitHub: the deployed copy can lag a
  // minute behind a save while Vercel rebuilds.
  useEffect(() => {
    if (!unlocked || !token) return;
    let cancelled = false;
    ghRead(token)
      .then(({ config: c }) => {
        if (cancelled) return;
        const remoteCustom = c.custom || [];
        setSaved(new Set(c.disabled || []));
        setSavedCustom(remoteCustom);
        if (!dirty.current) {
          setDisabled(new Set(c.disabled || []));
          setCustoms(remoteCustom);
          return;
        }
        // Keep unsaved local work: add local special quizzes GitHub doesn't have yet
        const remoteIds = new Set(remoteCustom.map((x) => x.id));
        setCustoms((prev) => [...remoteCustom, ...prev.filter((x) => !remoteIds.has(x.id))]);
      })
      .catch((e) => !cancelled && setStatus({ kind: 'err', msg: t('adminLoadFail', { e: e.message }) }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, token]);

  const quizzes = useMemo(() => [...data.quizzes, ...buildCustomQuizzes(data.quizzes, customs, lang)], [data, customs, lang]);
  const groups = useMemo(() => {
    const secName = Object.fromEntries(data.sections.map((s) => [s.id, s.name]));
    const subjName = Object.fromEntries((data.subjects || []).map((s) => [s.id, s.name]));
    return KINDS.map((k) => {
      const qs = quizzes.filter((q) => (q.kind || 'quiz') === k.id);
      const byGroup = new Map();
      for (const q of qs) {
        const g = k.id === 'custom' ? 'custom' : (k.id === 'subject' ? q.subject : q.section) || 'mix';
        if (!byGroup.has(g)) byGroup.set(g, []);
        byGroup.get(g).push(q);
      }
      const subs = [...byGroup].map(([g, list]) => ({
        id: g,
        name: g === 'custom' ? t('customQuizTab') : (k.id === 'subject' ? subjName[g] : secName[g]) || t('mixLabel'),
        quizzes: list,
      }));
      return { ...k, quizzes: qs, subs };
    }).filter((k) => k.quizzes.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, quizzes]);

  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />;

  const all = quizzes;
  const isOn = (q) => !disabled.has(baseId(q.id));
  const onCount = (list) => list.filter(isOn).length;
  const setMany = (list, on) => {
    dirty.current = true;
    return setDisabled((prev) => {
      const next = new Set(prev);
      for (const q of list) on ? next.delete(baseId(q.id)) : next.add(baseId(q.id));
      return next;
    });
  };
  const customIds = new Set(customs.map((c) => c.id));
  const savedCustomIds = new Set(savedCustom.map((c) => c.id));
  const changed =
    [...disabled].filter((id) => !saved.has(id)).length +
    [...saved].filter((id) => !disabled.has(id)).length +
    [...customIds].filter((id) => !savedCustomIds.has(id)).length +
    [...savedCustomIds].filter((id) => !customIds.has(id)).length;

  // The builder saves straight away: the new quiz is either switched on or left off
  const createCustom = async (c, enable) => {
    dirty.current = true;
    const nextCustoms = [...customs, c];
    const nextDisabled = new Set(disabled);
    if (enable) nextDisabled.delete(c.id);
    else nextDisabled.add(c.id);
    setCustoms(nextCustoms);
    setDisabled(nextDisabled);
    const ok = await save(nextCustoms, nextDisabled, enable ? t('customSavedOn') : t('customSavedOff'));
    if (!ok) {
      // Undo, so retrying from the (kept) form doesn't add the quiz twice
      setCustoms(customs);
      setDisabled(disabled);
    }
    return ok;
  };
  const deleteCustom = (id) => {
    if (!window.confirm(t('customDeleteConfirm'))) return;
    dirty.current = true;
    setCustoms((prev) => prev.filter((c) => c.id !== id));
    setDisabled((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Returns true when the file was written
  const save = async (nextCustoms = customs, nextDisabled = disabled, okMsg = t('adminSaved')) => {
    if (!token) {
      setStatus({ kind: 'err', msg: t('adminNeedToken') });
      return false;
    }
    setStatus({ kind: 'busy', msg: t('adminSaving') });
    const ids = new Set(nextCustoms.map((c) => c.id));
    // Drop switches for custom quizzes that no longer exist
    const next = {
      disabled: [...nextDisabled].filter((id) => !id.startsWith('custom-') || ids.has(id)).sort(),
      custom: nextCustoms,
    };
    try {
      const { sha } = await ghRead(token);
      await ghWrite(token, next, sha, `Quiz visibility: ${next.disabled.length} hidden, ${nextCustoms.length} special (admin page)`);
      setSaved(new Set(next.disabled));
      setSavedCustom(nextCustoms);
      dirty.current = false;
      onSaved(next);
      setStatus({ kind: 'ok', msg: okMsg });
      return true;
    } catch (e) {
      setStatus({ kind: 'err', msg: t('adminSaveFail', { e: e.message }) });
      return false;
    }
  };

  const OnOff = ({ list }) => (
    <span className="admin-bulk">
      <button type="button" className="chip" onClick={() => setMany(list, true)}>{t('adminAllOn')}</button>
      <button type="button" className="chip" onClick={() => setMany(list, false)}>{t('adminAllOff')}</button>
    </span>
  );

  return (
    <div className="admin">
      <nav className="chips admin-tabs" aria-label={t('adminTitle')}>
        <a className={!tab ? 'chip on' : 'chip'} href="#/enabledisablequizes">{t('adminTabToggle')}</a>
        <a className={tab === 'create' ? 'chip on' : 'chip'} href="#/enabledisablequizes/create">{t('adminTabCreate')}</a>
        <a className={tab === 'live' ? 'chip on' : 'chip'} href="#/enabledisablequizes/live">{t('adminTabLive')}</a>
        <a className={tab === 'suggestions' ? 'chip on' : 'chip'} href="#/enabledisablequizes/suggestions">{t('adminTabSuggestions')}</a>
        <a className="chip" href="#/pravachan">{t('adminTabPravachan')}</a>
      </nav>
      <h1>{tab === 'create' ? t('customTitle') : tab === 'live' ? t('liveTitle') : tab === 'suggestions' ? t('sugTitle') : t('adminTitle')}</h1>
      <p className="admin-note">{tab === 'create' ? t('customIntro') : tab === 'live' ? t('liveIntro') : t('adminIntro')}</p>

      <section className="admin-token">
        {token ? (
          <p>
            {t('adminTokenSet')}{' '}
            <button type="button" className="chip" onClick={() => { setAdminToken(''); setToken(''); }}>
              {t('adminTokenRemove')}
            </button>
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = tokenInput.trim();
              setAdminToken(v);
              setToken(v);
              setTokenInput('');
            }}
          >
            <label htmlFor="admin-token">{t('adminToken')}</label>
            <p className="admin-note">{t('adminTokenHelp', { repo: REPO })}</p>
            <input
              id="admin-token"
              type="password"
              autoComplete="off"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
            <button className="btn btn-ghost" type="submit" disabled={!tokenInput.trim()}>{t('adminTokenSave')}</button>
          </form>
        )}
      </section>

      {tab === 'suggestions' ? (
        <Suggestions />
      ) : tab === 'live' ? (
        <LiveHost quizzes={quizzes} />
      ) : tab === 'create' ? (
        <>
          {status && <p className={`admin-status ${status.kind}`}>{status.msg}</p>}
          <Custom data={data} onCreate={createCustom} busy={status?.kind === 'busy'} />
        </>
      ) : (
      <>
      <div className="admin-summary">
        <strong>{t('adminVisible', { a: num(onCount(all)), b: num(all.length) })}</strong>
        <OnOff list={all} />
      </div>

      {groups.map((k) => (
        <details key={k.id} className="admin-kind" open={k.id === 'custom'}>
          <summary>
            {t(k.label)} <span className="chip-count">{num(onCount(k.quizzes))} / {num(k.quizzes.length)}</span>
          </summary>
          <div className="admin-kind-bulk"><OnOff list={k.quizzes} /></div>
          {k.subs.map((s) => (
            <div key={s.id} className="admin-group">
              <div className="admin-group-head">
                <strong>{s.name}</strong>
                <span className="chip-count">{num(onCount(s.quizzes))} / {num(s.quizzes.length)}</span>
                <OnOff list={s.quizzes} />
              </div>
              {s.quizzes.map((q) => (
                <label key={q.id} className={isOn(q) ? 'admin-row' : 'admin-row off'}>
                  <input type="checkbox" checked={isOn(q)} onChange={(e) => setMany([q], e.target.checked)} />
                  <span>{q.title}</span>
                  <small>{t('adminQs', { n: num(q.questions.length) })}</small>
                  {q.kind === 'custom' && (
                    <>
                      <a className="chip" href={`#/quiz/${q.id}`}>{t('customPreview')}</a>
                      <button type="button" className="chip" onClick={(e) => { e.preventDefault(); deleteCustom(baseId(q.id)); }}>{t('customDelete')}</button>
                    </>
                  )}
                </label>
              ))}
            </div>
          ))}
        </details>
      ))}

      <div className="admin-savebar">
        <span>{changed ? t('adminUnsaved', { n: num(changed) }) : t('adminNoChanges')}</span>
        {status && <span className={`admin-status ${status.kind}`}>{status.msg}</span>}
        <button
          type="button"
          className="btn btn-primary"
          onClick={save}
          disabled={!changed || status?.kind === 'busy'}
        >
          {t('adminSave')}
        </button>
      </div>
      </>
      )}
    </div>
  );
}
