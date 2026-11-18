import { useEffect, useMemo, useState } from 'react';
import Home from './components/Home.jsx';
import Quiz from './components/Quiz.jsx';
import TitleIndex from './components/TitleIndex.jsx';
import Subjects from './components/Subjects.jsx';
import Prapti from './components/Prapti.jsx';
import { getTheme, setTheme, getLang, setLang } from './storage.js';
import { LangContext, makeT } from './i18n.js';

// Hash routes: #/  #/home/titles  #/home/topics  #/home/study  #/home/subject  #/quiz/<id>  #/practice/<sectionId|all>  #/titles
//              #/subjects  #/subjects/<subjectId>  #/subject-quiz/<subjectId>
//              #/prapti  #/prapti/<from yyyy-mm-dd>   (પ્રાપ્તિનો વિચાર section, one tab per date range)
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

// Each language has its own generated data file
const DATA_URL = { gu: '/data/quizzes.json', en: '/data/quizzes.en.json' };

export default function App() {
  const [lang, setLangState] = useState(() => getLang());
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState(parseHash);
  const [theme, setThemeState] = useState(() => getTheme());
  const [practiceKey, setPracticeKey] = useState(0);
  const [prapti, setPrapti] = useState(null);

  // Daily પ્રાપ્તિનો વિચાર content is language-independent (Gujarati), loaded once
  useEffect(() => {
    fetch('/data/prapti.json')
      .then((r) => (r.ok ? r.json() : null))
      .then(setPrapti)
      .catch(() => setPrapti({ days: [] }));
  }, []);
  const L = useMemo(() => makeT(lang), [lang]);
  const { t } = L;

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetch(DATA_URL[lang])
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    document.documentElement.lang = lang;
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    let prev = parseHash();
    const onHash = () => {
      const next = parseHash();
      // Switching between the Home tabs (knowledge/titles/topics/study) keeps the scroll
      // position so the quiz cards stay in view; any other navigation starts at the top.
      if (!(prev.page === 'home' && next.page === 'home')) window.scrollTo({ top: 0 });
      prev = next;
      setRoute(next);
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

  const toggleLang = () => {
    const next = lang === 'gu' ? 'en' : 'gu';
    // Quiz ids differ per language, so leave a running quiz for the home page
    if (route.page === 'quiz') navigate('/');
    setLangState(next);
    setLang(next);
  };

  // Random practice quiz: 20 questions from a section, a subject, or everything
  const practiceQuiz = useMemo(() => {
    if (!data) return null;
    if (route.page === 'subject-quiz') {
      // Subject quiz: questions about the Vachanamrut tagged with this subject.
      // Date/asker questions are left out since they don't test the subject.
      const subject = (data.subjects || []).find((s) => s.id === route.arg);
      if (!subject) return null;
      const inSubject = new Set(subject.vachnos);
      const pool = data.quizzes
        .filter((q) => q.kind !== 'titles' && q.kind !== 'subject')
        .flatMap((q) => q.questions)
        .filter((q) => inSubject.has(q.vachno) && !['date', 'asker'].includes(q.type));
      return {
        id: `practice-subject-${subject.id}`,
        title: t('subjectQuizTitle', { s: subject.name }),
        back: `#/subjects/${subject.id}`,
        questions: shuffle(pool).slice(0, 20),
      };
    }
    if (route.page !== 'practice') return null;
    const sec = data.sections.find((s) => s.id === route.arg);
    const pool = data.quizzes
      .filter((q) => q.kind !== 'titles' && q.kind !== 'subject' && (!sec || q.section === sec.id))
      .flatMap((q) => q.questions);
    return {
      id: `practice-${sec ? sec.id : 'all'}`,
      title: sec ? t('practiceSection', { s: sec.name }) : t('practiceAll'),
      questions: shuffle(pool).slice(0, 20),
    };
    // practiceKey forces a new random set on "play again"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, route.page, route.arg, practiceKey]);

  const notFound = (
    <div className="center-msg">
      {t('notFound')} <a href="#/">{t('goHome')}</a>
    </div>
  );

  let content;
  if (error) {
    content = <div className="center-msg">{t('loadError', { e: error })}</div>;
  } else if (!data) {
    content = (
      <div className="center-msg">
        <div className="spinner" aria-hidden="true" />
        {t('loading')}
      </div>
    );
  } else if (route.page === 'quiz') {
    const quiz = data.quizzes.find((q) => q.id === route.arg);
    content = quiz ? <Quiz key={quiz.id} quiz={quiz} data={data} /> : notFound;
  } else if (route.page === 'subjects') {
    content = <Subjects data={data} subjectId={route.arg} />;
  } else if (route.page === 'practice' || route.page === 'subject-quiz') {
    content = practiceQuiz ? (
      <Quiz
        key={`${lang}-${practiceQuiz.id}-${practiceKey}`}
        quiz={practiceQuiz}
        data={data}
        onNewSet={() => setPracticeKey((k) => k + 1)}
      />
    ) : (
      notFound
    );
  } else if (route.page === 'prapti') {
    content = <Prapti prapti={prapti} date={route.arg} />;
  } else if (route.page === 'titles') {
    content = <TitleIndex data={data} />;
  } else {
    content = <Home key={lang} data={data} mode={['titles', 'topics', 'study', 'subject'].includes(route.arg) ? route.arg : 'quiz'} />;
  }

  return (
    <LangContext.Provider value={L}>
      <div className="app">
        <header className="topbar">
          <a href="#/" className="brand" aria-label={t('appHome')}>
            <span className="brand-mark">{lang === 'gu' ? 'વ' : 'V'}</span>
            <span className="brand-text">
              <strong>{t('appName')}</strong>
              <small>{lang === 'gu' ? 'Vachanamrut Quiz' : 'વચનામૃત ક્વિઝ'}</small>
            </span>
          </a>
          <nav className="topnav">
            {/* Two sections: Vachanamrut Quiz and પ્રાપ્તિનો વિચાર */}
            <span className="sections" role="tablist" aria-label={t('sectionsLabel')}>
              <a href="#/" className={route.page !== 'prapti' ? 'section on' : 'section'}>{t('sectionQuiz')}</a>
              <a href="#/prapti" className={route.page === 'prapti' ? 'section on' : 'section'}>{t('sectionPrapti')}</a>
            </span>
            {route.page !== 'prapti' && (
              <>
                <a href="#/" className={route.page === 'home' ? 'active' : ''}>{t('navQuiz')}</a>
                <a href="#/subjects" className={route.page === 'subjects' ? 'active' : ''}>{t('navSubjects')}</a>
                <a href="#/titles" className={route.page === 'titles' ? 'active' : ''}>{t('navTitles')}</a>
              </>
            )}
            <button
              className="lang-btn"
              onClick={toggleLang}
              aria-label={t('langSwitchLabel')}
              title={t('langSwitchLabel')}
            >
              {t('langSwitch')}
            </button>
            <button className="icon-btn" onClick={toggleTheme} aria-label={t('theme')} title={t('theme')}>
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
          {t('footerSource')}{' '}
          <a href="https://www.anirdesh.com/vachanamrut/" target="_blank" rel="noreferrer">
            anirdesh.com
          </a>{' '}
          · {t('footerJai')}
          <div className="footer-credit">Developed by Sanjay Patel (Toronto)</div>
        </footer>
      </div>
    </LangContext.Provider>
  );
}
