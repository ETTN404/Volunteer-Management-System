import {
  Award,
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  Clock4,
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
  badgeKey?: 'applications' | 'documents' | 'hours';
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const NAV: Record<Role, NavSection[]> = {
  Volunteer: [
    {
      items: [
        { to: '/v', label: 'Home', icon: LayoutGrid, end: true, mobile: true },
        { to: '/v/opportunities', label: 'Opportunities', icon: Sparkles, mobile: true },
        { to: '/v/schedule', label: 'My schedule', icon: CalendarDays, mobile: true },
        { to: '/v/assistant', label: 'VolunBot', icon: Bot, mobile: true },
      ],
    },
    {
      label: 'Your record',
      items: [
        { to: '/v/impact', label: 'Impact', icon: Gauge },
        { to: '/v/certificates', label: 'Certificates', icon: Award },
        { to: '/v/documents', label: 'Documents', icon: FileCheck2 },
      ],
    },
    {
      label: 'Account',
      items: [
        { to: '/v/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/v/profile', label: 'Profile & skills', icon: UserCircle2, mobile: true },
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
      items: [
        { to: '/c/live', label: 'Live shifts', icon: Radar },
        { to: '/c/hours', label: 'Verify hours', icon: Clock4, badgeKey: 'hours' },
      ],
    },
    {
      label: 'People',
      items: [
        { to: '/c/volunteers', label: 'Volunteers', icon: Users },
        { to: '/c/documents', label: 'Documents', icon: FileCheck2, badgeKey: 'documents' },
      ],
    },
    {
      label: 'Outreach',
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
      items: [
        { to: '/c/events', label: 'Events', icon: CalendarRange },
        { to: '/c/applications', label: 'Applications', icon: Inbox },
        { to: '/o/reports', label: 'Impact reports', icon: BarChart3 },
        { to: '/c/announcements', label: 'Announcements', icon: Megaphone },
      ],
    },
    {
      label: 'Organization',
      items: [
        { to: '/o/settings', label: 'Settings & brand', icon: Settings2 },
        { to: '/o/audit', label: 'Audit trail', icon: ScrollText },
      ],
    },
  ],
  SuperAdmin: [
    {
      items: [
        { to: '/p', label: 'Platform', icon: Gauge, end: true },
        { to: '/p/organizations', label: 'Organizations', icon: Building2 },
        { to: '/p/onboard', label: 'Onboard tenant', icon: UserPlus },
      ],
    },
    {
      label: 'Governance',
      items: [
        { to: '/p/admins', label: 'Org admins', icon: ShieldCheck },
        { to: '/p/users', label: 'All users', icon: Users },
        { to: '/p/audit', label: 'Audit trail', icon: ScrollText },
      ],
    },
  ],
};

export const ACCOUNT_LINKS = [
  { to: '/account', label: 'Account & security', icon: ClipboardCheck },
  { to: '/account/notifications', label: 'Notifications', icon: FileText },
];
