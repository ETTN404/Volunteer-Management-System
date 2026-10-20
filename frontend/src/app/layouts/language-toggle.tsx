import { Languages } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/shared/lib/cn';
import { useLocaleStore, useT, type Locale } from '@/shared/i18n';
import { useSessionStore } from '@/features/auth/session-store';
import { authApi } from '@/features/auth/api';

const OPTIONS: { value: Locale; short: string; label: string }[] = [
  { value: 'en', short: 'EN', label: 'English' },
  { value: 'am', short: 'አማ', label: 'አማርኛ' },
];

/** EN | አማ switch. Signed-in users also get it saved on their account (SMS/Telegram language later). */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const token = useSessionStore((s) => s.token);
  const t = useT();
  return (
    <div role="group" aria-label={t('Language')} className={cn('flex h-8 items-center rounded-full bg-surface-2 p-0.5 text-[12px] font-semibold', className)}>
      <Languages className="mx-1.5 size-3.5 text-faint" aria-hidden />
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.label}
          aria-pressed={locale === o.value}
          onClick={() => {
            if (locale === o.value) return;
            setLocale(o.value);
            if (token) authApi.updateAccount({ locale: o.value }).catch(() => undefined);
          }}
          className={cn('h-7 rounded-full px-2.5 transition-colors', locale === o.value ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text')}
        >
          {o.short}
        </button>
      ))}
    </div>
  );
}

/** Keeps <html lang> in sync and adopts the account language on a device where none was picked. */
export function LocaleSync() {
  const locale = useLocaleStore((s) => s.locale);
  const chosen = useLocaleStore((s) => s.chosen);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const userLocale = useSessionStore((s) => s.user?.locale);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    if (!chosen && userLocale && userLocale !== locale) setLocale(userLocale, false);
  }, [chosen, userLocale, locale, setLocale]);
  return null;
}
