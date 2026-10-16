import { Plus, X } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { cn } from '@/shared/lib/cn';
import { humanizeSkill } from '@/shared/lib/format';

/**
 * Chip picker for skills (or any keyword list). Values are normalized keys; suggestions
 * are shown as one-tap chips and free text is accepted with Enter or comma.
 */
export function TagInput({
  value,
  onChange,
  suggestions = [],
  normalize = (s) => s.trim(),
  display = humanizeSkill,
  placeholder = 'Type and press Enter',
  max,
  id,
  'aria-invalid': invalid,
  'aria-describedby': describedBy,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions?: readonly string[];
  normalize?: (s: string) => string;
  display?: (s: string) => string;
  placeholder?: string;
  max?: number;
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}) {
  const [draft, setDraft] = useState('');
  const atMax = max != null && value.length >= max;

  const add = (raw: string) => {
    const v = normalize(raw);
    if (!v || value.includes(v) || atMax) return;
    onChange([...value, v]);
    setDraft('');
  };
  const remove = (v: string) => onChange(value.filter((x) => x !== v));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && !draft && value.length) {
      remove(value[value.length - 1]!);
    }
  };

  const filtered = useMemo(() => {
    const q = normalize(draft);
    return suggestions.filter((s) => !value.includes(s) && (!q || s.includes(q))).slice(0, 14);
  }, [suggestions, value, draft, normalize]);

  return (
    <div className="space-y-2.5">
      <div
        className={cn(
          'flex min-h-11 flex-wrap items-center gap-1.5 rounded-md bg-sunken p-1.5 shadow-[inset_0_0_0_1px_var(--line)] focus-within:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_4px_var(--accent-soft)]',
          invalid && 'shadow-[inset_0_0_0_1px_var(--danger)]',
        )}
      >
        {value.map((v) => (
          <span key={v} className="inline-flex h-7 items-center gap-1 rounded-md bg-accent-soft pl-2.5 pr-1 text-[13px] font-medium text-accent-text">
            {display(v)}
            <button type="button" onClick={() => remove(v)} className="grid size-5 place-items-center rounded hover:bg-accent/20" aria-label={`Remove ${display(v)}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft && add(draft)}
          placeholder={atMax ? `Up to ${max}` : value.length ? '' : placeholder}
          disabled={atMax}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          aria-label={id ? undefined : 'Add a skill'}
          className="h-7 min-w-32 flex-1 bg-transparent px-1.5 text-sm text-text outline-none placeholder:text-faint"
        />
      </div>
      {filtered.length > 0 && !atMax && (
        <div className="flex flex-wrap gap-1.5" aria-label="Suggestions">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[12.5px] text-muted shadow-[inset_0_0_0_1px_var(--line)] transition-colors hover:bg-surface-2 hover:text-text"
            >
              <Plus className="size-3" />
              {display(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
