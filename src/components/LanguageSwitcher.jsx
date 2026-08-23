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
      className="text-sm font-medium text-ink bg-paper hover:bg-rule/50 border border-rule rounded px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal transition-colors cursor-pointer"
      aria-label="Language selection"
    >
      {Object.values(languages).map((lang) => (
        <option key={lang.code} value={lang.code} className="text-ink bg-paper">
          {lang.nativeLabel}
        </option>
      ))}
    </select>
  );
}
