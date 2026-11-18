import { useLang } from '../i18n.js';

const messageKey = (pct) => (pct === 100 ? 'msg100' : pct >= 80 ? 'msg80' : pct >= 50 ? 'msg50' : 'msgLow');

export default function Results({ quiz, answers, review, onRetry, onRetryWrong }) {
  const { t, num } = useLang();
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
          <strong>{num(pct)}%</strong>
          <span>{num(correct)} / {num(total)}</span>
        </div>
        <h2>{review ? t('reviewDone') : quiz.title}</h2>
        <p className="result-msg">{t(messageKey(pct))}</p>
        <div className="result-actions">
          {wrong.length > 0 && (
            <button className="btn btn-primary" onClick={onRetryWrong}>
              {t('retryWrong', { n: wrong.length })}
            </button>
          )}
          <button className="btn btn-ghost" onClick={onRetry}>{t('playAgain')}</button>
          <a className="btn btn-ghost" href={quiz.back || (quiz.kind ? `#/home/${quiz.kind}` : '#/')}>{t('otherQuiz')}</a>
        </div>
      </div>

      {wrong.length > 0 && (
        <section className="review">
          <h3>{t('reviewWrong')}</h3>
          {wrong.map((a, i) => (
            <div className="review-item" key={i}>
              <p className="review-q">{a.q.question}</p>
              <p className="review-bad">{t('yourAnswer', { a: a.q.options[a.picked] })}</p>
              <p className="review-good">{t('rightAnswer', { a: a.q.options[a.q.answer] })}</p>
              <a href={a.q.link} target="_blank" rel="noreferrer">
                {t('readRef', { r: a.q.ref, t: a.q.title })}
              </a>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
