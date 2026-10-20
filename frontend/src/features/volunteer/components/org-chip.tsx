import { BadgeCheck, Building2 } from 'lucide-react';
import { Link } from 'react-router';
import type { EventOrganization } from '@/shared/types/api';
import { cn } from '@/shared/lib/cn';

/** Organization that posted an event — links to its page (all its active & past events). */
export function OrgChip({ org, className, linked = true, size = 'sm' }: { org?: EventOrganization | null; className?: string; linked?: boolean; size?: 'sm' | 'md' }) {
  if (!org) return null;
  const body = (
    <>
      <span
        className={cn('grid shrink-0 place-items-center overflow-hidden rounded-md bg-surface-2 text-faint ring-1 ring-line', size === 'md' ? 'size-9' : 'size-6')}
        style={org.primary_color && !org.logo_url ? { background: org.primary_color, color: '#fff' } : undefined}
      >
        {org.logo_url ? (
          <img src={org.logo_url} alt="" className="size-full object-cover" />
        ) : org.primary_color ? (
          <span className="text-[10px] font-bold">{org.name.slice(0, 2).toUpperCase()}</span>
        ) : (
          <Building2 className="size-3.5" />
        )}
      </span>
      <span className="min-w-0 truncate">{org.name}</span>
      {org.verification_status === 'verified' && <BadgeCheck className="size-3.5 shrink-0 text-accent-text" aria-label="Verified organization" />}
    </>
  );
  const cls = cn('relative inline-flex min-w-0 max-w-full items-center gap-2 font-medium text-text', size === 'md' ? 'text-sm' : 'text-[12.5px]', className);
  return linked ? (
    <Link to={`/v/organizations/${org.id}`} className={cn(cls, 'z-20 hover:text-accent-text')} onClick={(e) => e.stopPropagation()}>
      {body}
    </Link>
  ) : (
    <span className={cls}>{body}</span>
  );
}
