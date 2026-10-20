/**
 * Country, city and phone inputs.
 * - Countries & cities are static JSON generated from `country-state-city` at build time
 *   (scripts/build-geo.mjs): ~12 KB for the country list, one small file per country.
 * - Phone numbers are validated per country with libphonenumber-js and emitted in E.164
 *   (+251911234567), the format the API validates.
 */
import { AsYouType, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { useFieldControl } from './field';
import { Combobox, type ComboOption } from './combobox';

interface GeoCountry {
  iso: string;
  name: string;
  phone: string;
}
interface GeoCity {
  name: string;
  region: string | null;
}

const cache = new Map<string, Promise<unknown>>();
const geoUrl = (path: string) => `${import.meta.env.BASE_URL ?? '/'}geo/${path}`.replace(/\/{2,}/g, '/');
function loadJson<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(geoUrl(path))
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => {
          cache.delete(path);
          return [];
        }),
    );
  }
  return cache.get(path) as Promise<T>;
}

function useGeo<T>(path: string | null): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    if (!path) return setData(null);
    let alive = true;
    setData(null);
    loadJson<T>(path).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [path]);
  return data;
}

export const flagEmoji = (iso: string) =>
  iso.length === 2 ? String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))) : '🏳️';

export function countryName(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(iso.toUpperCase()) ?? iso;
  } catch {
    return iso;
  }
}

export function CountrySelect({ value, onChange, id, invalid }: { value?: string | null; onChange: (iso: string) => void; id?: string; invalid?: boolean }) {
  const countries = useGeo<GeoCountry[]>('countries.json');
  const options: ComboOption[] = useMemo(() => {
    if (!countries?.length) return value ? [{ value, label: countryName(value), icon: flagEmoji(value) }] : [];
    const all = countries.map((c) => ({
      value: c.iso,
      label: c.name,
      icon: flagEmoji(c.iso),
      hint: `+${c.phone}`,
      keywords: [c.iso, c.phone],
    }));
    // Ethiopia and neighbours first — most organizations on VolunTrack are here.
    const top = ['ET', 'KE', 'DJ', 'SO', 'ER', 'SD', 'SS'];
    return [...top.map((t) => all.find((o) => o.value === t)!).filter(Boolean), ...all.filter((o) => !top.includes(o.value))];
  }, [countries, value]);
  return (
    <Combobox
      id={id}
      invalid={invalid}
      options={options}
      value={value}
      onChange={onChange}
      loading={!countries}
      placeholder="Select country"
      searchPlaceholder="Search countries…"
    />
  );
}

export function CitySelect({
  country,
  value,
  onChange,
  id,
  invalid,
}: {
  country?: string | null;
  value?: string | null;
  onChange: (city: string) => void;
  id?: string;
  invalid?: boolean;
}) {
  const cities = useGeo<GeoCity[]>(country ? `cities/${country.toUpperCase()}.json` : null);
  const options: ComboOption[] = useMemo(() => (cities ?? []).map((c) => ({ value: c.name, label: c.name, hint: c.region ?? undefined })), [cities]);
  return (
    <Combobox
      id={id}
      invalid={invalid}
      options={options}
      value={value}
      onChange={onChange}
      loading={Boolean(country) && !cities}
      disabled={!country}
      allowCustom
      placeholder={country ? 'Select city' : 'Choose a country first'}
      searchPlaceholder="Search cities…"
      empty="No city found"
    />
  );
}

export function isValidPhone(e164: string | null | undefined, country?: string | null): boolean {
  if (!e164) return false;
  const p = parsePhoneNumberFromString(e164, (country ?? undefined) as CountryCode | undefined);
  return Boolean(p?.isValid());
}

export function formatPhone(e164?: string | null): string {
  if (!e164) return '';
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}

const dialCode = (country?: string | null) => {
  try {
    return country ? `+${getCountryCallingCode(country.toUpperCase() as CountryCode)}` : '+';
  } catch {
    return '+';
  }
};

/**
 * Phone input with the country's dialing code in front. Emits E.164 or '' while empty.
 * When the country changes, the dialing code follows it.
 */
export function PhoneInput({
  country,
  value,
  onChange,
  id,
  invalid,
  placeholder,
  'aria-describedby': describedBy,
}: {
  country?: string | null;
  value?: string | null;
  onChange: (e164: string) => void;
  id?: string;
  invalid?: boolean;
  placeholder?: string;
  'aria-describedby'?: string;
}) {
  const fc = useFieldControl();
  id = id ?? fc?.id;
  invalid = invalid ?? fc?.invalid;
  const code = dialCode(country);
  const parsed = value ? parsePhoneNumberFromString(value) : undefined;
  const national = parsed && `+${parsed.countryCallingCode}` === code ? parsed.formatNational() : value?.startsWith(code) ? value.slice(code.length) : '';
  const [text, setText] = useState(national);

  // Country changed → re-emit with the new dialing code.
  useEffect(() => {
    const digits = text.replace(/\D/g, '');
    if (digits) onChange(`${code}${digits.replace(/^0+/, '')}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const example = placeholder ?? (country === 'ET' || !country ? '911 234 567' : 'Phone number');

  return (
    <div
      className={cn(
        'flex h-10 w-full items-center rounded-md bg-sunken shadow-[inset_0_0_0_1px_var(--line)] focus-within:bg-surface focus-within:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)]',
        invalid && 'shadow-[inset_0_0_0_1px_var(--danger),0_0_0_4px_var(--danger-soft)]',
      )}
    >
      <span className="flex h-full items-center gap-1.5 border-r border-line px-3 text-sm text-muted tabular-nums">
        {country && <span aria-hidden>{flagEmoji(country)}</span>}
        {code}
      </span>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        value={text}
        placeholder={example}
        onChange={(e) => {
          const raw = e.target.value;
          const formatted = country ? new AsYouType(country.toUpperCase() as CountryCode).input(raw) : raw;
          setText(formatted.length < text.length ? raw : formatted);
          const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
          onChange(digits ? `${code}${digits}` : '');
        }}
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm text-text outline-none placeholder:text-faint"
      />
    </div>
  );
}
