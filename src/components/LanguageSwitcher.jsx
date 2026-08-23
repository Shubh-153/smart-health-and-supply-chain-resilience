import React from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from '../i18n/languages';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <select 
      value={i18n.resolvedLanguage || 'en'} 
      onChange={handleChange}
      className="bg-white/10 text-white text-xs py-1 px-2 rounded border border-white/20 outline-none hover:bg-white/20 transition-colors"
      aria-label="Language selection"
    >
      {Object.values(languages).map((lang) => (
        <option key={lang.code} value={lang.code} className="text-slate-800">
          {lang.nativeLabel}
        </option>
      ))}
    </select>
  );
}
