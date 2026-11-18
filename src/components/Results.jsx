const toGu = (n) => String(n).replace(/\d/g, (d) => '૦૧૨૩૪૫૬૭૮૯'[d]);

function message(pct) {
  if (pct === 100) return 'અદ્ભુત! સંપૂર્ણ ગુણ — જય સ્વામિનારાયણ!';
  if (pct >= 80) return 'ખૂબ સરસ! વચનામૃતનું ઉત્તમ જ્ઞાન.';
  if (pct >= 50) return 'સારું! થોડું વધુ વાંચન કરો.';
  return 'અભ્યાસ ચાલુ રાખો — વચનામૃત ફરી વાંચો.';
}

export default function Results({ quiz, answers, review, onRetry, onRetryWrong }) {
  const total = answers.length;
  const correct = answers.filter((a) => a.correct).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const wrong = answers.filter((a) => !a.correct);
  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className="results">
      <div className="result-card">
        <svg className="ring" viewBox="0 0 128 128" aria-hidden="true">
          <circle cx="64" cy="64" r={R} className="ring-bg" />
          <circle
            cx="64"
            cy="64"
            r={R}
            className="ring-fg"
            strokeDasharray={C}
            strokeDashoffset={C - (C * pct) / 100}
          />
        </svg>
        <div className="ring-label">
          <strong>{toGu(pct)}%</strong>
          <span>{toGu(correct)} / {toGu(total)}</span>
        </div>
        <h2>{review ? 'પુનરાવર્તન પૂર્ણ' : quiz.title}</h2>
        <p className="result-msg">{message(pct)}</p>
        <div className="result-actions">
          {wrong.length > 0 && (
            <button className="btn btn-primary" onClick={onRetryWrong}>
              ખોટા પ્રશ્નો ફરી ({toGu(wrong.length)})
            </button>
          )}
          <button className="btn btn-ghost" onClick={onRetry}>ફરી રમો</button>
          <a className="btn btn-ghost" href={quiz.kind === 'titles' ? '#/home/titles' : '#/'}>બીજી ક્વિઝ</a>
        </div>
      </div>

      {wrong.length > 0 && (
        <section className="review">
          <h3>ખોટા જવાબોની સમીક્ષા</h3>
          {wrong.map((a, i) => (
            <div className="review-item" key={i}>
              <p className="review-q">{a.q.question}</p>
              <p className="review-bad">તમારો જવાબ: {a.q.options[a.picked]}</p>
              <p className="review-good">સાચો જવાબ: {a.q.options[a.q.answer]}</p>
              <a href={a.q.link} target="_blank" rel="noreferrer">
                {a.q.ref} — {a.q.title} વાંચો ↗
              </a>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
