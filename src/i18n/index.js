import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { supportedLngs } from './languages';

import en from '../locales/en/translation.json';
import pt from '../locales/pt/translation.json';
import ru from '../locales/ru/translation.json';
import hi from '../locales/hi/translation.json';
import zh from '../locales/zh/translation.json';

const resources = {
  en: { translation: en },
  pt: { translation: pt },
  ru: { translation: ru },
  hi: { translation: hi },
  zh: { translation: zh },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs,
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'aarogya-language',
      caches: ['localStorage']
    },
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
