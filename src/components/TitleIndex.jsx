import { useMemo, useState } from 'react';

// Searchable list of all 262 Vachanamrut titles, with the quiz that covers each one
export default function TitleIndex({ data }) {
  const [term, setTerm] = useState('');

  const quizFor = useMemo(() => {
    const m = {};
    for (const q of data.quizzes) for (const v of q.covers) (m[v] ||= []).push(q);
    return m;
  }, [data]);

  const t = term.trim();
  const list = data.vachanamruts.filter(
    (v) => !t || v.title.includes(t) || v.ref.includes(t) || (v.date || '').includes(t)
  );

  return (
    <div className="titles">
      <h1 className="page-h">વચનામૃત સૂચિ</h1>
      <input
        className="search"
        type="search"
        placeholder="શીર્ષક અથવા વચનામૃત શોધો… (દા.ત. માયા, લોયા ૧૦)"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        aria-label="વચનામૃત શોધો"
      />
      {data.sections.map((s) => {
        const items = list.filter((v) => v.vachno >= s.from && v.vachno <= s.to);
        if (!items.length) return null;
        return (
          <section key={s.id} className="title-sec">
            <h2>{s.name} <small>{s.en}</small></h2>
            <ul>
              {items.map((v) => (
                <li key={v.vachno}>
                  <span className="t-ref">{v.ref}</span>
                  <span className="t-title">
                    <a
                      href={`https://www.anirdesh.com/vachanamrut/index.php?format=gu&vachno=${v.vachno}`}
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
      {!list.length && <p className="center-msg">કંઈ મળ્યું નહીં.</p>}
    </div>
  );
}
