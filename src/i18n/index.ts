import { create } from 'zustand';
import { Language, TranslationSchema } from './types';
import { vi } from './locales/vi';
import { en } from './locales/en';

const dictionaries: Record<Language, TranslationSchema> = {
  vi,
  en
};

const STORAGE_KEY = 'universe_engine_lang';

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'vi';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Language;
    if (saved === 'vi' || saved === 'en') return saved;
  } catch {
    // LocalStorage might be disabled
  }
  return 'vi';
}

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  language: getInitialLanguage(),
  setLanguage: (language: Language) => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Ignore storage errors
    }
    set({ language });
  },
  toggleLanguage: () => {
    const next: Language = get().language === 'vi' ? 'en' : 'vi';
    get().setLanguage(next);
  }
}));

/**
 * Universal translation resolver supporting nested dot-notation keys
 * e.g. t('nav.explore') or t('surface.altitude')
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const lang = useI18nStore.getState().language;
  const dict = dictionaries[lang] || dictionaries.vi;

  const parts = key.split('.');
  let current: unknown = dict;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      // Fallback to English if missing in current dictionary
      let fallbackCurrent: unknown = dictionaries.en;
      for (const fallbackPart of parts) {
        if (fallbackCurrent && typeof fallbackCurrent === 'object' && fallbackPart in fallbackCurrent) {
          fallbackCurrent = (fallbackCurrent as Record<string, unknown>)[fallbackPart];
        } else {
          return key;
        }
      }
      current = fallbackCurrent;
      break;
    }
  }

  if (typeof current !== 'string') {
    return key;
  }

  let result = current;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    }
  }

  return result;
}

/**
 * Standard React Hook for components
 */
export function useTranslation() {
  const language = useI18nStore((state) => state.language);
  const setLanguage = useI18nStore((state) => state.setLanguage);
  const toggleLanguage = useI18nStore((state) => state.toggleLanguage);

  return {
    t: (key: string, params?: Record<string, string | number>) => t(key, params),
    language,
    setLanguage,
    toggleLanguage,
    isVietnamese: language === 'vi'
  };
}

export * from './types';
