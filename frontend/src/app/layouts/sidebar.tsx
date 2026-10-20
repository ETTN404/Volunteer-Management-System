import { motion } from 'motion/react';
import { NavLink } from 'react-router';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Avatar, Badge, LogoMark, Tooltip } from '@/shared/ui';
import type { Organization, Role, User } from '@/shared/types/api';
import { ROLE_LABEL } from '@/features/auth/session-store';
import { useT } from '@/shared/i18n';
import { NAV, type NavItem } from '../navigation';

export type NavBadges = Partial<Record<NonNullable<NavItem['badgeKey']>, number>>;

export function Sidebar({
  role,
  user,
  org,
  collapsed,
  onToggle,
  badges,
  onNavigate,
  mobile,
}: {
  role: Role;
  user: User;
  org?: Organization | null;
  collapsed: boolean;
  onToggle?: () => void;
  badges?: NavBadges;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const c = collapsed && !mobile;
  const t = useT();
  return (
    <nav aria-label="Workspace" className={cn('flex h-full flex-col bg-sunken', !mobile && 'border-r border-line')}>
      {/* Workspace identity */}
      <div className={cn('flex h-16 shrink-0 items-center gap-3 border-b border-line', c ? 'justify-center px-2' : 'px-4')}>
        <LogoMark className="size-8 shrink-0" />
        {!c && (
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold text-text">{org?.name ?? t('VolunTrack Platform')}</div>
            <div className="type-eyebrow-sm">{t(ROLE_LABEL[role])}</div>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV[role].map((section, si) => (
          <div key={si}>
            {section.label && !c && <div className="type-eyebrow mb-2 px-2.5 !text-[10px]">{t(section.label)}</div>}
            {section.label && c && <div className="mx-auto mb-2 h-px w-6 bg-line" />}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const count = item.badgeKey ? badges?.[item.badgeKey] : undefined;
                const link = (
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex h-9 items-center gap-3 rounded-md text-[13.5px] font-medium transition-colors',
                        c ? 'justify-center px-0' : 'px-2.5',
                        isActive ? 'text-text' : 'text-muted hover:bg-surface-2 hover:text-text',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId={mobile ? 'nav-active-mobile' : 'nav-active'}
                            className="absolute inset-0 rounded-md bg-surface [box-shadow:var(--elev-1),inset_0_0_0_1px_var(--line)]"
                            transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                          />
                        )}
                        {isActive && <span className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r-full bg-accent" />}
                        <item.icon className={cn('relative size-[18px] shrink-0', isActive ? 'text-accent-text' : 'text-faint group-hover:text-muted')} />
                        {!c && <span className="relative flex-1 truncate">{t(item.label)}</span>}
                        {!c && count ? (
                          <Badge tone="accent" size="sm" className="relative type-data">
                            {count}
                          </Badge>
                        ) : null}
                        {c && count ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" /> : null}
                      </>
                    )}
                  </NavLink>
                );
                return (
                  <li key={item.to}>
                    {c ? (
                      <Tooltip content={t(item.label)} side="right">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer: account + collapse */}
      <div className={cn('shrink-0 border-t border-line p-3', c && 'px-2')}>
        <NavLink
          to="/account"
          onClick={onNavigate}
          className={cn('flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-surface-2', c && 'justify-center')}
        >
          <Avatar name={user.full_name} src={user.profile_photo_url} size="sm" />
          {!c && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-text">{user.full_name}</div>
              <div className="truncate text-[11.5px] text-faint">{user.email}</div>
            </div>
          )}
        </NavLink>
        {onToggle && !mobile && (
          <button
            onClick={onToggle}
            className={cn('mt-2 flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-xs text-faint transition-colors hover:bg-surface-2 hover:text-muted', c && 'justify-center px-0')}
            aria-label={c ? t('Expand sidebar') : t('Collapse sidebar')}
          >
            {c ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {!c && <span>{t('Collapse')}</span>}
          </button>
        )}
      </div>
    </nav>
  );
}
