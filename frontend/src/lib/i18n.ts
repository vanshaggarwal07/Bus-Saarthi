import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from '../locales/en/common.json';
import hiCommon from '../locales/hi/common.json';
import paCommon from '../locales/pa/common.json';

const resources = {
  en: { common: enCommon },
  hi: { common: hiCommon },
  pa: { common: paCommon },
} as const;

const storedLang = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
const defaultLang = storedLang || 'en';

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });

export default i18n;
