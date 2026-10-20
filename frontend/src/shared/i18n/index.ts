import { useCallback } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { am } from './am';

/**
 * Tiny i18n: the English text is the key, so an untranslated string simply
 * shows in English. Placeholders use {name}.
 *
 * Amharic style guide (see am.ts): everyday spoken Amharic, not formal
 * dictionary words. Keep the English term when that is what people say
 * (shift, check-in, QR, GPS, app, profile, email, password…).
 */
export type Locale = 'en' | 'am';

const DICTS: Record<Locale, Record<string, string>> = { en: {}, am };

interface LocaleState {
  locale: Locale;
  /** True once the user picked a language on this device (then the account value doesn't override it). */
  chosen: boolean;
  setLocale: (l: Locale, chosen?: boolean) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'en',
      chosen: false,
      setLocale: (locale, chosen = true) => set({ locale, chosen }),
    }),
    { name: 'vt-locale', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

export type TFunction = (text: string, vars?: Record<string, string | number>) => string;

export function translate(locale: Locale, text: string, vars?: Record<string, string | number>): string {
  const out = DICTS[locale][text] ?? text;
  return vars ? out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : out;
}

/** Translate outside React (toasts, error mappers). */
export const t: TFunction = (text, vars) => translate(useLocaleStore.getState().locale, text, vars);

export function useT(): TFunction {
  const locale = useLocaleStore((s) => s.locale);
  return useCallback((text, vars) => translate(locale, text, vars), [locale]);
}

export const useLocale = () => useLocaleStore((s) => s.locale);

/** Plural helper: plural(n, 'shift', 'shifts') → English only; Amharic keeps one form. */
export function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}
