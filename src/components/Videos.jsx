import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../i18n.js';
import { norm, searchTerms, matchesAll } from '../textSearch.jsx';

// આશીર્વાદ વિડિયો section (#/videos[/<view>[/<key>]]): the Guruhari Ashirwad YouTube
// playlist, from public/data/videos.json (npm run build-videos). Views: by subject (the
// site's વિષય list + sabha themes; Vachanamrut discourses inherit that Vachanamrut's
// subjects), by Vachanamrut, by occasion, year and place. Tapping a video plays it on
// the page (youtube-nocookie embed). Videos whose title has no topic have no subject —
// they are found by year/place/search.
const VIEWS = ['subject', 'vachanamrut', 'occasion', 'year', 'place'];
const OCCASION_KEYS = ['gurupurnima', 'diwali', 'newyear', 'janmashtami', 'ramnavami', 'rathyatra', 'rakshabandhan', 'navratri', 'uttarayan', 'ekadashi', 'punam', 'janmajayanti', 'diksha', 'patotsav', 'yogaday'];

const thumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

export default function Videos({ data, view: viewArg, sel }) {
  const { t, num, lang, link } = useLang();
  const [lib, setLib] = useState(null);
  const [query, setQuery] = useState('');
  const [playing, setPlaying] = useState(null);
  const view = VIEWS.includes(viewArg) ? viewArg : 'subject';
  const key = sel ? decodeURIComponent(sel) : '';

  useEffect(() => {
    fetch('/data/videos.json')
      .then((r) => (r.ok ? r.json() : { videos: [], subjects: [] }))
      .then(setLib)
      .catch(() => setLib({ videos: [], subjects: [] }));
  }, []);

  const vByNo = useMemo(() => new Map((data?.vachanamruts || []).map((v) => [v.vachno, v])), [data]);
  const subjName = useMemo(() => Object.fromEntries((lib?.subjects || []).map((s) => [s.id, lang === 'en' ? s.en : s.gu])), [lib, lang]);
  const hay = useMemo(
    () =>
      new Map(
        (lib?.videos || []).map((v) => [
          v.id,
          norm(`${v.title} ${v.place} ${v.subjects.map((s) => subjName[s]).join(' ')} ${v.vachno ? vByNo.get(v.vachno)?.ref + ' ' + vByNo.get(v.vachno)?.title : ''}`),
        ])
      ),
    [lib, subjName, vByNo]
  );

  if (!lib) return <div className="center-msg">{t('loading')}</div>;
  const videos = lib.videos;
  const count = (fn) => videos.filter(fn).length;
  const byDate = (a, b) => (b.date || '').localeCompare(a.date || '');
  const fmtDate = (d) => {
    if (!d || d.length < 10) return d || '';
    return new Date(`${d}T00:00:00`).toLocaleDateString(lang === 'gu' ? 'gu-IN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const terms = searchTerms(query);
  const label = (v) => {
    if (v.vachno) {
      const ref = vByNo.get(v.vachno)?.ref;
      return `${t('vidVachanamrut')} ${ref}${v.part ? ` — ${t('vidPart', { n: num(v.part) })}` : ''}`;
    }
    return v.topic || t('vidAshirwad');
  };

  const VideoCard = ({ v }) => (
    <button
      type="button"
      className={`vid-card${playing?.id === v.id ? ' on' : ''}`}
      onClick={() => {
        setPlaying(v);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
    >
      <img src={thumb(v.id)} alt="" loading="lazy" />
      <span className="vid-body">
        <strong>{label(v)}</strong>
        <small>{[fmtDate(v.date), v.place, v.session && t(`vidSession_${v.session}`)].filter(Boolean).join(' · ')}</small>
        {v.subjects.length > 0 && (
          <span className="vid-tags">{v.subjects.slice(0, 3).map((s) => <span key={s} className="chip">{subjName[s]}</span>)}</span>
        )}
      </span>
    </button>
  );
  const List = ({ items }) => (
    <div className="vid-list">
      {items.sort(byDate).map((v) => <VideoCard key={v.id} v={v} />)}
    </div>
  );

  // Groups for the current view: [{ key, name, count }]
  let groups = [];
  let inGroup = () => false;
  if (view === 'subject') {
    groups = lib.subjects.map((s) => ({ key: s.id, name: subjName[s.id], count: count((v) => v.subjects.includes(s.id)) }));
    inGroup = (v, k) => v.subjects.includes(k);
  } else if (view === 'vachanamrut') {
    groups = (data?.sections || []).map((s) => ({ key: s.id, name: s.name, count: count((v) => v.vachno && vByNo.get(v.vachno)?.section === s.id) })).filter((g) => g.count);
    inGroup = (v, k) => v.vachno && vByNo.get(v.vachno)?.section === k;
  } else if (view === 'occasion') {
    groups = OCCASION_KEYS.map((k) => ({ key: k, name: t(`vidOcc_${k}`), count: count((v) => v.occasion === k) })).filter((g) => g.count);
    inGroup = (v, k) => v.occasion === k;
  } else if (view === 'year') {
    const years = [...new Set(videos.map((v) => v.date.slice(0, 4)).filter(Boolean))].sort().reverse();
    groups = years.map((y) => ({ key: y, name: num(y), count: count((v) => v.date.startsWith(y)) }));
    inGroup = (v, k) => v.date.startsWith(k);
  } else if (view === 'place') {
    const places = Object.entries(videos.reduce((m, v) => (v.place ? ((m[v.place] = (m[v.place] || 0) + 1), m) : m), {}));
    groups = places.sort((a, b) => b[1] - a[1]).map(([p, n]) => ({ key: p, name: p, count: n }));
    inGroup = (v, k) => v.place === k;
  }
  const current = groups.find((g) => g.key === key);

  return (
    <div className="pv vid">
      <p className="pv-kicker">{t('vidKicker')}</p>
      <h1>{t('vidTitle')}</h1>
      <p className="pv-meta">{t('vidIntro', { n: num(videos.length), s: num(count((v) => v.subjects.length)) })}</p>

      {playing && (
        <div className="vid-player">
          <div className="vid-frame">
            <iframe
              key={playing.id}
              src={`https://www.youtube-nocookie.com/embed/${playing.id}?autoplay=1&rel=0`}
              title={playing.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
          <div className="vid-player-info">
            <strong>{label(playing)}</strong>
            <small>{[fmtDate(playing.date), playing.place].filter(Boolean).join(' · ')}</small>
            <span className="vid-tags">
              {playing.subjects.map((s) => <a key={s} className="chip" href={`#/videos/subject/${s}`}>{subjName[s]}</a>)}
              {playing.vachno && (
                <a className="chip" href={link(playing.vachno)} target="_blank" rel="noreferrer">
                  {vByNo.get(playing.vachno)?.ref} — {vByNo.get(playing.vachno)?.title}
                </a>
              )}
            </span>
            <span className="vid-actions">
              <a className="btn btn-ghost" href={`https://www.youtube.com/watch?v=${playing.id}`} target="_blank" rel="noreferrer">{t('vidOpenYoutube')}</a>
              <button type="button" className="btn btn-ghost" onClick={() => setPlaying(null)}>{t('vidClose')}</button>
            </span>
          </div>
        </div>
      )}

      <input className="search pv-search" type="search" placeholder={t('vidSearch')} value={query} onChange={(e) => setQuery(e.target.value)} />

      {terms.length ? (
        (() => {
          const results = videos.filter((v) => matchesAll(hay.get(v.id), terms));
          return (
            <section>
              <p className="pv-meta">{results.length ? t('pravachanResults', { n: num(results.length) }) : t('pravachanNoResults')}</p>
              <List items={results.slice(0, 200)} />
            </section>
          );
        })()
      ) : (
        <>
          <nav className="chips" aria-label={t('vidViews')}>
            {VIEWS.map((v) => (
              <a key={v} className={view === v ? 'chip on' : 'chip'} href={`#/videos/${v}`}>{t(`vidView_${v}`)}</a>
            ))}
          </nav>

          {current ? (
            <section>
              <a className="pv-back" href={`#/videos/${view}`}>← {t(`vidView_${view}`)}</a>
              <h2 className="vid-group-title">{current.name} <span className="chip-count">{num(current.count)}</span></h2>
              {view === 'vachanamrut' ? (
                <div className="vid-list">
                  {videos
                    .filter((v) => inGroup(v, key))
                    .sort((a, b) => a.vachno - b.vachno || a.part - b.part)
                    .map((v) => <VideoCard key={v.id} v={v} />)}
                </div>
              ) : (
                <List items={videos.filter((v) => inGroup(v, key))} />
              )}
            </section>
          ) : (
            <>
              {view === 'subject' && <p className="pv-meta">{t('vidSubjectNote', { n: num(count((v) => !v.subjects.length)) })}</p>}
              <div className="vid-groups">
                {groups.map((g) => (
                  <a key={g.key} className="vid-group" href={`#/videos/${view}/${encodeURIComponent(g.key)}`}>
                    <strong>{g.name}</strong>
                    <span className="chip-count">{num(g.count)}</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </>
      )}
      <p className="pv-source">
        {t('praptiSource')}{' '}
        <a href={`https://www.youtube.com/playlist?list=${lib.playlist}`} target="_blank" rel="noreferrer">YouTube — Guruhari Ashirwad</a>
      </p>
    </div>
  );
}
