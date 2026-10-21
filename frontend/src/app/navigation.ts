import {
  Award,
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  Clock4,
  CreditCard,
  Flag,
  HeartPulse,
  MessageSquare,
  FileCheck2,
  FileText,
  Gauge,
  Inbox,
  LayoutGrid,
  Megaphone,
  Radar,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/shared/types/api';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match child routes as active. */
  end?: boolean;
  /** Shown in the mobile bottom bar (volunteer). */
  mobile?: boolean;
  /** One-word label for the mobile bottom bar. */
  short?: string;
  badgeKey?: 'applications' | 'documents' | 'hours';
  /** Other paths that belong to this item (breadcrumb + highlight), e.g. detail pages. */
  match?: string[];
}

export interface NavSection {
  label?: string;
  /** Icon for the collapsible group (labelled sections only). */
  icon?: LucideIcon;
  items: NavItem[];
}

export const NAV: Record<Role, NavSection[]> = {
  Volunteer: [
    {
      items: [
        { to: '/v', label: 'Home', icon: LayoutGrid, end: true, mobile: true, short: 'Home' },
        { to: '/v/opportunities', label: 'Opportunities', icon: Sparkles, mobile: true, short: 'Explore', match: ['/v/organizations'] },
        { to: '/v/schedule', label: 'My schedule', icon: CalendarDays, mobile: true, short: 'Schedule', match: ['/v/check-in'] },
        { to: '/v/assistant', label: 'VolunBot', icon: Bot, mobile: true, short: 'VolunBot' },
      ],
    },
    {
      label: 'Your record',
      icon: Award,
      items: [
        { to: '/v/impact', label: 'Impact', icon: Gauge },
        { to: '/v/certificates', label: 'Certificates', icon: Award },
        { to: '/v/documents', label: 'Documents', icon: FileCheck2 },
      ],
    },
    {
      label: 'Account',
      icon: UserCircle2,
      items: [
        { to: '/v/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/v/profile', label: 'Profile & skills', icon: UserCircle2, mobile: true, short: 'Profile' },
      ],
    },
  ],
  Coordinator: [
    {
      items: [
        { to: '/c', label: 'Operations', icon: Radar, end: true },
        { to: '/c/events', label: 'Events', icon: CalendarRange },
        { to: '/c/calendar', label: 'Calendar', icon: CalendarDays },
        { to: '/c/applications', label: 'Applications', icon: Inbox, badgeKey: 'applications' },
      ],
    },
    {
      label: 'Attendance',
      icon: Clock4,
      items: [
        { to: '/c/live', label: 'Live shifts', icon: Radar },
        { to: '/c/hours', label: 'Verify hours', icon: Clock4, badgeKey: 'hours' },
      ],
    },
    {
      label: 'People',
      icon: Users,
      items: [
        { to: '/c/volunteers', label: 'Volunteers', icon: Users },
        { to: '/c/documents', label: 'Documents', icon: FileCheck2, badgeKey: 'documents' },
      ],
    },
    {
      label: 'Outreach',
      icon: Megaphone,
      items: [
        { to: '/c/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/c/reports', label: 'Impact reports', icon: BarChart3 },
      ],
    },
  ],
  OrgAdmin: [
    {
      items: [
        { to: '/o', label: 'Overview', icon: Gauge, end: true },
        { to: '/o/team', label: 'Coordinators', icon: UsersRound },
        { to: '/o/members', label: 'Volunteers', icon: Users },
      ],
    },
    {
      label: 'Operations',
      icon: Radar,
      items: [
        { to: '/c/events', label: 'Events', icon: CalendarRange },
        { to: '/c/applications', label: 'Applications', icon: Inbox },
        { to: '/c/live', label: 'Live shifts', icon: Radar },
        { to: '/c/hours', label: 'Verify hours', icon: Clock4, badgeKey: 'hours' },
        { to: '/o/reports', label: 'Impact reports', icon: BarChart3 },
        { to: '/c/announcements', label: 'Announcements', icon: Megaphone },
      ],
    },
    {
      label: 'Organization',
      icon: Building2,
      items: [
        { to: '/o/settings', label: 'Settings & brand', icon: Settings2 },
        { to: '/o/billing', label: 'Plan & billing', icon: CreditCard },
        { to: '/o/messages', label: 'Messages', icon: MessageSquare },
        { to: '/o/audit', label: 'Audit trail', icon: ScrollText },
      ],
    },
  ],
  SuperAdmin: [
    {
      items: [
        { to: '/p', label: 'Platform', icon: Gauge, end: true },
        { to: '/p/organizations', label: 'Organizations', icon: Building2 },
        { to: '/p/onboard', label: 'Onboard organization', icon: UserPlus },
        { to: '/p/messages', label: 'Messages', icon: MessageSquare },
      ],
    },
    {
      label: 'Business',
      icon: CreditCard,
      items: [
        { to: '/p/payments', label: 'Payments', icon: CreditCard },
        { to: '/p/health', label: 'System health', icon: HeartPulse },
      ],
    },
    {
      label: 'Governance',
      icon: ShieldCheck,
      items: [
        { to: '/p/admins', label: 'Org admins', icon: ShieldCheck },
        { to: '/p/users', label: 'All users', icon: Users },
        { to: '/p/reports', label: 'Reports', icon: Flag },
        { to: '/p/audit', label: 'Audit trail', icon: ScrollText },
      ],
    },
  ],
};

export const ACCOUNT_LINKS = [
  { to: '/account', label: 'Account & security', icon: ClipboardCheck },
  { to: '/account/notifications', label: 'Notifications', icon: FileText },
];

/** Same rule NavLink uses: exact for `end` items, prefix otherwise. */
export function isNavActive(item: NavItem, pathname: string) {
  const under = (base: string) => pathname === base || pathname.startsWith(base + '/');
  if (item.match?.some(under)) return true;
  return item.end ? pathname === item.to : under(item.to);
}

/** Best nav match for a path (longest prefix) + its section — used by the breadcrumb. */
export function findNavMatch(role: Role, pathname: string): { item: NavItem; section: NavSection } | null {
  let best: { item: NavItem; section: NavSection } | null = null;
  for (const section of NAV[role]) {
    for (const item of section.items) {
      if (isNavActive(item, pathname)) {
        if (!best || item.to.length > best.item.to.length) best = { item, section };
      }
    }
  }
  return best;
}
