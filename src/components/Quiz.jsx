import { useCallback, useEffect, useMemo, useState } from 'react';
import { saveScore } from '../storage.js';
import Results from './Results.jsx';

const LETTERS = ['ક', 'ખ', 'ગ', 'ઘ'];
const toGu = (n) => String(n).replace(/\d/g, (d) => '૦૧૨૩૪૫૬૭૮૯'[d]);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle question order and option order every attempt; keep the correct index in sync
function prepare(questions) {
  return shuffle(questions).map((q) => {
    const order = shuffle(q.options.map((_, i) => i));
    return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
  });
}

export default function Quiz({ quiz, onNewSet }) {
  const [round, setRound] = useState({ questions: quiz.questions, review: false, n: 0 });
  const questions = useMemo(() => prepare(round.questions), [round]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);

  const q = questions[idx];
  const answered = picked !== null;
  const correctCount = answers.filter((a) => a.correct).length;

  const choose = useCallback(
    (i) => {
      if (answered || finished) return;
      setPicked(i);
      setAnswers((prev) => [...prev, { q, picked: i, correct: i === q.answer }]);
    },
    [answered, finished, q]
  );

  const next = useCallback(() => {
    if (!answered) return;
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setPicked(null);
    } else {
      setFinished(true);
      if (!round.review && !quiz.id.startsWith('practice')) {
        saveScore(quiz.id, answers.filter((a) => a.correct).length, questions.length);
      }
    }
  }, [answered, idx, questions.length, round.review, quiz.id, answers]);

  useEffect(() => {
    const onKey = (e) => {
      if (finished) return;
      if (['1', '2', '3', '4'].includes(e.key)) choose(Number(e.key) - 1);
      else if (e.key === 'Enter' || e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, next, finished]);

  const restart = (qs, review) => {
    setRound((r) => ({ questions: qs, review, n: r.n + 1 }));
    setIdx(0);
    setPicked(null);
    setAnswers([]);
    setFinished(false);
    window.scrollTo({ top: 0 });
  };

  if (finished) {
    return (
      <Results
        quiz={quiz}
        answers={answers}
        review={round.review}
        onRetry={() => (onNewSet && !round.review ? onNewSet() : restart(quiz.questions, false))}
        onRetryWrong={() => restart(answers.filter((a) => !a.correct).map((a) => a.q), true)}
      />
    );
  }

  const progress = ((idx + (answered ? 1 : 0)) / questions.length) * 100;

  return (
    <div className="quiz">
      <div className="quiz-head">
        <a href={quiz.kind === 'titles' ? '#/home/titles' : '#/'} className="back" aria-label="પાછા જાઓ">←</a>
        <div className="quiz-title">
          <h2>{round.review ? 'ખોટા જવાબો — પુનરાવર્તન' : quiz.title}</h2>
          <small>
            પ્રશ્ન {toGu(idx + 1)} / {toGu(questions.length)} · સાચા {toGu(correctCount)}
          </small>
        </div>
      </div>
      <div className="progress" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>

      <article className="qcard" key={q.id + idx}>
        <span className="qtype">{typeLabel(q.type)}</span>
        <p className="qtext">{q.question}</p>

        <div className="options" role="radiogroup">
          {q.options.map((opt, i) => {
            let cls = 'option';
            if (answered) {
              if (i === q.answer) cls += ' correct';
              else if (i === picked) cls += ' wrong';
              else cls += ' dim';
            }
            return (
              <button
                key={i}
                className={cls}
                onClick={() => choose(i)}
                disabled={answered}
                role="radio"
                aria-checked={picked === i}
              >
                <span className="opt-letter">{LETTERS[i]}</span>
                <span className="opt-text">{opt}</span>
                {answered && i === q.answer && <span className="opt-mark" aria-label="સાચો">✓</span>}
                {answered && i === picked && i !== q.answer && <span className="opt-mark" aria-label="ખોટો">✕</span>}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className={`feedback ${picked === q.answer ? 'ok' : 'bad'}`}>
            <strong>{picked === q.answer ? 'સરસ! સાચો જવાબ.' : 'ખોટો જવાબ.'}</strong>
            <span>
              વચનામૃત {q.ref} — “{q.title}”.{' '}
              <a href={q.link} target="_blank" rel="noreferrer">વચનામૃત વાંચો ↗</a>
            </span>
          </div>
        )}
      </article>

      <div className="quiz-foot">
        <span className="hint">કીબોર્ડ: ૧–૪ પસંદ કરો, Enter આગળ</span>
        <button className="btn btn-primary" onClick={next} disabled={!answered}>
          {idx + 1 < questions.length ? 'આગળ →' : 'પરિણામ જુઓ'}
        </button>
      </div>
    </div>
  );
}

function typeLabel(t) {
  return (
    {
      'title-to-ref': 'શીર્ષક પરથી વચનામૃત',
      'ref-to-title': 'શીર્ષક ઓળખો',
      'section-title': 'શીર્ષક ઓળખો',
      date: 'તિથિ',
      teaching: 'ઉપદેશ',
      asker: 'પ્રશ્નકર્તા',
    }[t] || 'પ્રશ્ન'
  );
}
