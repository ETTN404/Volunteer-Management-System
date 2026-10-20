import { Command } from 'cmdk';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { useFieldControl } from './field';
import { Popover, PopoverContent, PopoverTrigger } from './overlay';

export interface ComboOption {
  value: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  /** Extra words to match while searching. */
  keywords?: string[];
}

/** Searchable select (shadcn "combobox" pattern on cmdk). */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  empty = 'No match.',
  loading,
  disabled,
  id,
  invalid,
  allowCustom,
  className,
}: {
  options: ComboOption[];
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  empty?: string;
  loading?: boolean;
  disabled?: boolean;
  id?: string;
  invalid?: boolean;
  /** Offer the typed text as a value when nothing matches (e.g. a small town missing from the list). */
  allowCustom?: boolean;
  className?: string;
}) {
  const fc = useFieldControl();
  id = id ?? fc?.id;
  invalid = invalid ?? fc?.invalid;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? (value || '');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-md bg-sunken px-3 text-left text-sm shadow-[inset_0_0_0_1px_var(--line)] transition-[box-shadow] hover:shadow-[inset_0_0_0_1px_var(--line-strong)] focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:shadow-[inset_0_0_0_1px_var(--danger)]',
            className,
          )}
        >
          {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
          <span className={cn('min-w-0 flex-1 truncate', !label && 'text-faint')}>{label || placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-faint" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        <Command loop filter={(v, search, keywords) => (`${v} ${(keywords ?? []).join(' ')}`.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search className="size-4 text-faint" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={searchPlaceholder}
              className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-faint"
            />
          </div>
          <Command.List className="max-h-64 overflow-y-auto overscroll-contain p-1">
            {loading && <div className="px-3 py-6 text-center text-sm text-muted">Loading…</div>}
            {!loading && (
              <Command.Empty className="px-3 py-4 text-center text-sm text-muted">
                {allowCustom && query.trim() ? (
                  <button
                    type="button"
                    className="w-full rounded-sm px-2 py-1.5 text-left text-text hover:bg-surface-2"
                    onClick={() => {
                      onChange(query.trim());
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    Use “{query.trim()}”
                  </button>
                ) : (
                  empty
                )}
              </Command.Empty>
            )}
            {!loading &&
              options.map((o) => (
                <Command.Item
                  key={o.value}
                  value={`${o.label} ${o.value}`}
                  keywords={o.keywords}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm aria-selected:bg-surface-2"
                >
                  {o.icon && <span className="shrink-0">{o.icon}</span>}
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="shrink-0 text-xs text-faint">{o.hint}</span>}
                  {o.value === value && <Check className="size-4 shrink-0 text-accent-text" />}
                </Command.Item>
              ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
