import { createContext, useContext, useState } from 'react';
import en from './en.json';
import id from './id.json';

const translations = { en, id };

function resolve(obj, key) {
  return key.split('.').reduce((o, k) => o?.[k], obj);
}

function t(lang, key, vars = {}) {
  const val = resolve(translations[lang], key) ?? resolve(translations.en, key) ?? key;
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), val);
}

export const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('lang') || 'en'
  );

  const setLang = (l) => {
    localStorage.setItem('lang', l);
    setLangState(l);
  };

  const translate = (key, vars) => t(lang, key, vars);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}

export function LanguageSwitcher({ variant = 'dark' }) {
  const { lang, setLang } = useTranslation();
  const isLight = variant === 'light';

  const track = {
    display: 'inline-flex',
    borderRadius: 20,
    padding: 3,
    gap: 0,
    background: isLight ? 'rgba(255,255,255,0.15)' : '#e2e8f0',
    border: isLight ? '1px solid rgba(255,255,255,0.25)' : '1px solid #cbd5e1',
  };

  const segBase = {
    padding: '4px 11px',
    borderRadius: 16,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
    transition: 'background 0.15s, color 0.15s',
  };

  const activeStyle = {
    ...segBase,
    background: isLight ? '#fff' : '#1a1a2e',
    color: isLight ? '#1a1a2e' : '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
  };

  const inactiveStyle = {
    ...segBase,
    background: 'transparent',
    color: isLight ? 'rgba(255,255,255,0.75)' : '#64748b',
  };

  return (
    <div style={track}>
      <button style={lang === 'en' ? activeStyle : inactiveStyle} onClick={() => setLang('en')}>EN</button>
      <button style={lang === 'id' ? activeStyle : inactiveStyle} onClick={() => setLang('id')}>ID</button>
    </div>
  );
}
