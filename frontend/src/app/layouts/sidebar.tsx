import { AnimatePresence, motion } from 'motion/react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import {
    Building2,
    ChevronDown,
    ChevronsUpDown,
    ExternalLink,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
    UserCircle2,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import {
    Avatar,
    Badge,
    LogoMark,
    Menu,
    MenuContent,
    MenuItem,
    MenuLabel,
    MenuSeparator,
    MenuTrigger,
    Tooltip,
} from '@/shared/ui';
import type { Organization, Role, User } from '@/shared/types/api';
import { ROLE_LABEL } from '@/features/auth/session-store';
import { useLogout } from '@/features/auth/api';
import { useT } from '@/shared/i18n';
import { NAV, isNavActive, type NavItem, type NavSection } from '../navigation';
import { useUiStore } from '../ui-store';

export type NavBadges = Partial<Record<NonNullable<NavItem['badgeKey']>, number>>;

interface SidebarProps {
    role: Role;
    user: User;
    org?: Organization | null;
    collapsed: boolean;
    onToggle?: () => void;
    badges?: NavBadges;
    onNavigate?: () => void;
    mobile?: boolean;
}

/** Workspace identity card: logo tile, name, role — opens account actions. */
function WorkspaceCard({ role, org, compact }: { role: Role; org?: Organization | null; compact: boolean }) {
    const t = useT();
    const navigate = useNavigate();
    const logout = useLogout();
    const name = org?.name ?? t('VolunTrack Platform');
    const logo = org?.logo_url ? (
        <img src={org.logo_url} alt="" className="size-full object-cover" />
    ) : org ? (
        <span className="text-[13px] font-bold" style={{ color: org.primary_color ?? undefined }}>
            {org.name.slice(0, 2).toUpperCase()}
        </span>
    ) : (
        <LogoMark className="size-7" />
    );
    return (
        <Menu>
            <MenuTrigger asChild>
                <button
                    className={cn(
                        'group flex w-full items-center gap-3 rounded-[18px] bg-surface text-left [box-shadow:0_1px_2px_rgba(17,21,43,0.04),inset_0_0_0_1px_var(--line)] transition-shadow hover:[box-shadow:0_6px_18px_-10px_rgba(17,21,43,0.25),inset_0_0_0_1px_var(--line-strong)]',
                        compact ? 'justify-center p-1.5' : 'p-2.5',
                    )}
                    aria-label={t('Workspace menu')}
                >
                    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[12px] bg-surface-2 [box-shadow:0_2px_8px_-2px_rgba(17,21,43,0.18),inset_0_0_0_1px_var(--line)]">
                        {logo}
                    </span>
                    {!compact && (
                        <>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14px] font-semibold text-text">
                                    {name}
                                </span>
                                <span className="block truncate text-[12px] text-muted">
                                    {t('{role} workspace', { role: t(ROLE_LABEL[role]) })}
                                </span>
                            </span>
                            <ChevronsUpDown className="size-4 shrink-0 text-faint group-hover:text-muted" />
                        </>
                    )}
                </button>
            </MenuTrigger>
            <MenuContent align="start" className="w-64">
                <MenuLabel>{name}</MenuLabel>
                {org && role !== 'SuperAdmin' && (
                    <MenuItem onSelect={() => window.open(`/orgs/${org.id}`, '_blank', 'noopener')}>
                        <Building2 /> {t('Public page')}{' '}
                        <ExternalLink className="ml-auto !size-3.5 text-faint" />
                    </MenuItem>
                )}
                <MenuItem onSelect={() => navigate('/account')}>
                    <UserCircle2 /> {t('Account & security')}
                </MenuItem>
                <MenuSeparator />
                <MenuItem danger onSelect={() => logout.mutate()}>
                    <LogOut /> {t('Sign out')}
                </MenuItem>
            </MenuContent>
        </Menu>
    );
}

function ItemLink({
    item,
    badges,
    compact,
    child,
    onNavigate,
}: {
    item: NavItem;
    badges?: NavBadges;
    compact: boolean;
    child?: boolean;
    onNavigate?: () => void;
}) {
    const t = useT();
    const { pathname } = useLocation();
    const alias = Boolean(item.match?.some((m) => pathname === m || pathname.startsWith(m + '/')));
    const count = item.badgeKey ? badges?.[item.badgeKey] : undefined;
    const link = (
        <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive: navActive }) => {
                const isActive = navActive || alias;
                return cn(
                    'group relative flex items-center gap-3 rounded-[12px] font-medium transition-colors',
                    child ? 'h-9 px-3 text-[13.5px]' : 'h-10 px-3 text-[14px]',
                    compact && 'justify-center px-0',
                    isActive ? 'bg-accent-soft text-text' : 'text-muted hover:bg-surface-2 hover:text-text',
                );
            }}
        >
            {({ isActive: navActive }) => {
                const isActive = navActive || alias;
                return (
                    <>
                        {isActive && !child && (
                            <span className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r-full bg-accent" />
                        )}
                        {(!child || compact) && (
                            <item.icon
                                className={cn(
                                    'size-[18px] shrink-0',
                                    isActive ? 'text-accent-text' : 'text-faint group-hover:text-muted',
                                )}
                            />
                        )}
                        {!compact && <span className="flex-1 truncate">{t(item.label)}</span>}
                        {!compact && count ? (
                            <Badge tone="accent" size="sm" className="type-data">
                                {count}
                            </Badge>
                        ) : null}
                        {compact && count ? (
                            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent" />
                        ) : null}
                    </>
                );
            }}
        </NavLink>
    );
    return compact ? (
        <Tooltip content={t(item.label)} side="right">
            {link}
        </Tooltip>
    ) : (
        link
    );
}

/** Labelled section → folding group (auto-open when it holds the current page). */
function Group({
    role,
    section,
    badges,
    compact,
    onNavigate,
}: {
    role: Role;
    section: NavSection;
    badges?: NavBadges;
    compact: boolean;
    onNavigate?: () => void;
}) {
    const t = useT();
    const { pathname } = useLocation();
    const key = `${role}:${section.label}`;
    const stored = useUiStore((s) => s.navGroups[key]);
    const setGroup = useUiStore((s) => s.setNavGroup);
    const hasActive = section.items.some((i) => isNavActive(i, pathname));
    const open = stored ?? hasActive;
    const total = section.items.reduce((n, i) => n + ((i.badgeKey && badges?.[i.badgeKey]) || 0), 0);
    const Icon = section.icon ?? Building2;

    if (compact) {
        return (
            <div className="space-y-1 border-t border-line pt-2">
                {section.items.map((i) => (
                    <ItemLink key={i.to} item={i} badges={badges} compact onNavigate={onNavigate} />
                ))}
            </div>
        );
    }
    return (
        <div>
            <button
                type="button"
                onClick={() => setGroup(key, !open)}
                aria-expanded={open}
                className={cn(
                    'group flex h-10 w-full items-center gap-3 rounded-[12px] px-3 text-[14px] font-medium transition-colors hover:bg-surface-2',
                    hasActive ? 'text-text' : 'text-muted hover:text-text',
                )}
            >
                <Icon
                    className={cn(
                        'size-[18px] shrink-0',
                        hasActive ? 'text-accent-text' : 'text-faint group-hover:text-muted',
                    )}
                />
                <span className="flex-1 truncate text-left">{t(section.label!)}</span>
                {!open && total > 0 && <span className="size-2 rounded-full bg-accent" />}
                <ChevronDown
                    className={cn(
                        'size-4 shrink-0 text-faint transition-transform duration-300',
                        open && 'rotate-180',
                    )}
                />
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        className="relative ml-[21px] space-y-0.5 overflow-hidden border-l border-line py-1 pl-3"
                    >
                        {section.items.map((i) => (
                            <li key={i.to}>
                                <ItemLink
                                    item={i}
                                    badges={badges}
                                    compact={false}
                                    child
                                    onNavigate={onNavigate}
                                />
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
}

export function Sidebar({ role, user, org, collapsed, onToggle, badges, onNavigate, mobile }: SidebarProps) {
    const t = useT();
    const c = collapsed && !mobile;
    return (
        <nav aria-label="Workspace" className="flex h-full flex-col">
            <div className={cn('shrink-0 p-3', c && 'px-2')}>
                <WorkspaceCard role={role} org={org} compact={c} />
            </div>

            <div
                className={cn(
                    'flex-1 space-y-1 overflow-y-auto px-3 py-2 [scrollbar-gutter:stable]',
                    c && 'px-2',
                )}
            >
                {NAV[role].map((section, si) =>
                    section.label ? (
                        <Group
                            key={si}
                            role={role}
                            section={section}
                            badges={badges}
                            compact={c}
                            onNavigate={onNavigate}
                        />
                    ) : (
                        <ul key={si} className="space-y-1 pb-1">
                            {section.items.map((item) => (
                                <li key={item.to}>
                                    <ItemLink
                                        item={item}
                                        badges={badges}
                                        compact={c}
                                        onNavigate={onNavigate}
                                    />
                                </li>
                            ))}
                        </ul>
                    ),
                )}
            </div>

            <div className={cn('shrink-0 border-t border-line p-3', c && 'px-2')}>
                <NavLink
                    to="/account"
                    onClick={onNavigate}
                    className={cn(
                        'flex items-center gap-3 rounded-[14px] p-2 transition-colors hover:bg-surface-2',
                        c && 'justify-center',
                    )}
                >
                    <Avatar name={user.full_name} src={user.profile_photo_url} size="sm" />
                    {!c && (
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-semibold text-text">
                                {user.full_name}
                            </span>
                            <span className="block truncate text-[12px] text-muted">
                                {t(ROLE_LABEL[role])}
                            </span>
                        </span>
                    )}
                </NavLink>
                {onToggle && !mobile && (
                    <button
                        onClick={onToggle}
                        className={cn(
                            'mt-1 flex h-9 w-full items-center gap-2.5 rounded-[12px] px-2.5 text-[13px] text-muted transition-colors hover:bg-surface-2 hover:text-text',
                            c && 'justify-center px-0',
                        )}
                        aria-label={c ? t('Expand sidebar') : t('Collapse sidebar')}
                    >
                        {c ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                        {!c && <span>{t('Collapse')}</span>}
                    </button>
                )}
            </div>
        </nav>
    );
}
