import { useEffect, useMemo, useState } from 'react';
import Home from './components/Home.jsx';
import Quiz from './components/Quiz.jsx';
import TitleIndex from './components/TitleIndex.jsx';
import { getTheme, setTheme } from './storage.js';

// Hash routes: #/  #/home/titles  #/quiz/<id>  #/practice/<sectionId|all>  #/titles
function parseHash() {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/');
  return { page: parts[0] || 'home', arg: parts[1] || null };
}

export function navigate(path) {
  window.location.hash = path;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState(parseHash);
  const [theme, setThemeState] = useState(() => getTheme());
  const [practiceKey, setPracticeKey] = useState(0);

  useEffect(() => {
    fetch('/data/quizzes.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme) root.setAttribute('data-theme', theme);
    else root.removeAttribute('data-theme');
  }, [theme]);

  const toggleTheme = () => {
    const isDark =
      theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';
    setThemeState(next);
    setTheme(next);
  };

  // Random practice quiz: 20 questions from a section or everything
  const practiceQuiz = useMemo(() => {
    if (!data || route.page !== 'practice') return null;
    const sec = data.sections.find((s) => s.id === route.arg);
    const pool = data.quizzes
      .filter((q) => q.kind !== 'titles' && (!sec || q.section === sec.id)).flatMap((q) => q.questions);
    return {
      id: `practice-${sec ? sec.id : 'all'}`,
      title: sec ? `${sec.name} — ઝડપી અભ્યાસ` : 'સર્વ વચનામૃત — ઝડપી અભ્યાસ',
      questions: shuffle(pool).slice(0, 20),
    };
    // practiceKey forces a new random set on "play again"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, route.page, route.arg, practiceKey]);

  let content;
  if (error) {
    content = <div className="center-msg">ડેટા લોડ થઈ શક્યો નહીં ({error}). પેજ ફરી લોડ કરો.</div>;
  } else if (!data) {
    content = (
      <div className="center-msg">
        <div className="spinner" aria-hidden="true" />
        લોડ થઈ રહ્યું છે…
      </div>
    );
  } else if (route.page === 'quiz') {
    const quiz = data.quizzes.find((q) => q.id === route.arg);
    content = quiz ? (
      <Quiz key={quiz.id} quiz={quiz} data={data} />
    ) : (
      <div className="center-msg">ક્વિઝ મળી નહીં. <a href="#/">હોમ પર જાઓ</a></div>
    );
  } else if (route.page === 'practice') {
    content = (
      <Quiz
        key={`${practiceQuiz.id}-${practiceKey}`}
        quiz={practiceQuiz}
        data={data}
        onNewSet={() => setPracticeKey((k) => k + 1)}
      />
    );
  } else if (route.page === 'titles') {
    content = <TitleIndex data={data} />;
  } else {
    content = <Home data={data} mode={route.arg === 'titles' ? 'titles' : 'quiz'} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <a href="#/" className="brand" aria-label="વચનામૃત ક્વિઝ હોમ">
          <span className="brand-mark">વ</span>
          <span className="brand-text">
            <strong>વચનામૃત ક્વિઝ</strong>
            <small>Vachanamrut Quiz</small>
          </span>
        </a>
        <nav className="topnav">
          <a href="#/" className={route.page === 'home' ? 'active' : ''}>ક્વિઝ</a>
          <a href="#/titles" className={route.page === 'titles' ? 'active' : ''}>સૂચિ</a>
          <button className="icon-btn" onClick={toggleTheme} aria-label="થીમ બદલો" title="થીમ બદલો">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"
              />
            </svg>
          </button>
        </nav>
      </header>
      <main className="container">{content}</main>
      <footer className="footer">
        વચનામૃત લખાણ સ્રોત:{' '}
        <a href="https://www.anirdesh.com/vachanamrut/" target="_blank" rel="noreferrer">
          anirdesh.com
        </a>{' '}
        · ॥ શ્રી સ્વામિનારાયણો વિજયતે ॥
        <div className="footer-credit">Developed by Sanjay Patel (Toronto)</div>
      </footer>
    </div>
  );
}
