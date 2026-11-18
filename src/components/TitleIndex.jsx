import { useMemo, useState } from 'react';
import { useLang } from '../i18n.js';

// Searchable list of all Vachanamrut titles, with the quiz that covers each one
export default function TitleIndex({ data }) {
  const { t: tr, link } = useLang();
  const [term, setTerm] = useState('');

  const quizFor = useMemo(() => {
    const m = {};
    for (const q of data.quizzes.filter((x) => x.kind !== 'subject')) for (const v of q.covers) (m[v] ||= []).push(q);
    return m;
  }, [data]);

  const t = term.trim();
  const list = data.vachanamruts.filter(
    (v) => !t || [v.title, v.ref, v.date || ''].some((x) => x.toLowerCase().includes(t.toLowerCase()))
  );

  return (
    <div className="titles">
      <h1 className="page-h">{tr('titleIndex')}</h1>
      <input
        className="search"
        type="search"
        placeholder={tr('searchTitles')}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        aria-label={tr('searchTitlesLabel')}
      />
      {data.sections.map((s) => {
        const items = list.filter((v) => v.section === s.id);
        if (!items.length) return null;
        return (
          <section key={s.id} className="title-sec">
            <h2>{s.name} {s.alt && <small>{s.alt}</small>}</h2>
            <ul>
              {items.map((v) => (
                <li key={v.vachno}>
                  <span className="t-ref">{v.ref}</span>
                  <span className="t-title">
                    <a
                      href={link(v.vachno)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {v.title}
                    </a>
                    {v.date && <small>{v.date}</small>}
                  </span>
                  <span className="t-quiz">
                    {(quizFor[v.vachno] || []).map((q) => (
                      <a key={q.id} href={`#/quiz/${q.id}`} className="mini-chip">
                        {q.title.split('—')[1]?.trim()}
                      </a>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!list.length && <p className="center-msg">{tr('nothingFound')}</p>}
    </div>
  );
}
