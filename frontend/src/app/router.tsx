import { createBrowserRouter, type RouteObject } from 'react-router';
import { BootScreen, Root } from './root';
import { RedirectIfAuthed, RequireAuth, RequireRole, RoleRedirect } from './guards';
import { WorkspaceLayout } from './layouts/workspace-layout';
import { ForbiddenPage, NotFoundPage, RouteErrorPage, SuspendedPage } from '@/pages/errors/error-pages';

/** Lazy route module helper: each page file default-exports its component. */
const page = (load: () => Promise<{ default: React.ComponentType }>) => ({
  lazy: async () => ({ Component: (await load()).default }),
});

export const routes: RouteObject[] = [
  {
    element: <Root />,
    errorElement: <RouteErrorPage />,
    hydrateFallbackElement: <BootScreen />,
    children: [
      { path: '/', ...page(() => import('@/pages/landing/landing-page')) },
      { path: '/verify/:number?', ...page(() => import('@/pages/public/verify-page')) },
      { path: '/403', element: <ForbiddenPage /> },
      { path: '/suspended', element: <SuspendedPage /> },
      {
        element: <RedirectIfAuthed />,
        children: [
          { path: '/login', ...page(() => import('@/pages/auth/login-page')) },
          { path: '/register', ...page(() => import('@/pages/auth/register-page')) },
          { path: '/forgot-password', ...page(() => import('@/pages/auth/forgot-password-page')) },
          { path: '/reset-password/:token', ...page(() => import('@/pages/auth/reset-password-page')) },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: '/app', element: <RoleRedirect /> },
          {
            element: <WorkspaceLayout />,
            errorElement: <RouteErrorPage />,
            children: [
              {
                path: '/v',
                element: <RequireRole roles={['Volunteer']} />,
                children: [
                  { index: true, ...page(() => import('@/pages/volunteer/home-page')) },
                  { path: 'opportunities', ...page(() => import('@/pages/volunteer/opportunities-page')) },
                  { path: 'opportunities/:eventId', ...page(() => import('@/pages/volunteer/opportunity-detail-page')) },
                  { path: 'schedule', ...page(() => import('@/pages/volunteer/schedule-page')) },
                  { path: 'check-in/:shiftId', ...page(() => import('@/pages/volunteer/check-in-page')) },
                  { path: 'impact', ...page(() => import('@/pages/volunteer/impact-page')) },
                  { path: 'certificates', ...page(() => import('@/pages/volunteer/certificates-page')) },
                  { path: 'documents', ...page(() => import('@/pages/volunteer/documents-page')) },
                  { path: 'profile', ...page(() => import('@/pages/volunteer/profile-page')) },
                  { path: 'assistant', ...page(() => import('@/pages/volunteer/assistant-page')) },
                  { path: 'announcements', ...page(() => import('@/pages/shared/announcements-page')) },
                ],
              },
              {
                path: '/c',
                element: <RequireRole roles={['Coordinator', 'OrgAdmin']} />,
                children: [
                  { index: true, ...page(() => import('@/pages/coordinator/operations-page')) },
                  { path: 'events', ...page(() => import('@/pages/coordinator/events-page')) },
                  { path: 'events/new', ...page(() => import('@/pages/coordinator/event-editor-page')) },
                  { path: 'events/:eventId', ...page(() => import('@/pages/coordinator/event-detail-page')) },
                  { path: 'events/:eventId/edit', ...page(() => import('@/pages/coordinator/event-editor-page')) },
                  { path: 'calendar', ...page(() => import('@/pages/coordinator/calendar-page')) },
                  { path: 'applications', ...page(() => import('@/pages/coordinator/applications-page')) },
                  { path: 'live', ...page(() => import('@/pages/coordinator/live-index-page')) },
                  { path: 'live/:shiftId', ...page(() => import('@/pages/coordinator/live-shift-page')) },
                  { path: 'hours', ...page(() => import('@/pages/coordinator/hours-page')) },
                  { path: 'volunteers', ...page(() => import('@/pages/coordinator/volunteers-page')) },
                  { path: 'volunteers/:volunteerId', ...page(() => import('@/pages/coordinator/volunteer-detail-page')) },
                  { path: 'documents', ...page(() => import('@/pages/coordinator/documents-review-page')) },
                  { path: 'announcements', ...page(() => import('@/pages/coordinator/announcements-manager-page')) },
                  { path: 'reports', ...page(() => import('@/pages/coordinator/reports-page')) },
                ],
              },
              {
                path: '/o',
                element: <RequireRole roles={['OrgAdmin']} />,
                children: [
                  { index: true, ...page(() => import('@/pages/org/overview-page')) },
                  { path: 'settings', ...page(() => import('@/pages/org/settings-page')) },
                  { path: 'team', ...page(() => import('@/pages/org/team-page')) },
                  { path: 'members', ...page(() => import('@/pages/org/members-page')) },
                  { path: 'members/:volunteerId', ...page(() => import('@/pages/coordinator/volunteer-detail-page')) },
                  { path: 'reports', ...page(() => import('@/pages/coordinator/reports-page')) },
                  { path: 'audit', ...page(() => import('@/pages/org/audit-page')) },
                ],
              },
              {
                path: '/p',
                element: <RequireRole roles={['SuperAdmin']} />,
                children: [
                  { index: true, ...page(() => import('@/pages/platform/platform-page')) },
                  { path: 'organizations', ...page(() => import('@/pages/platform/organizations-page')) },
                  { path: 'organizations/:orgId', ...page(() => import('@/pages/platform/organization-detail-page')) },
                  { path: 'onboard', ...page(() => import('@/pages/platform/onboard-page')) },
                  { path: 'admins', ...page(() => import('@/pages/platform/admins-page')) },
                  { path: 'users', ...page(() => import('@/pages/platform/users-page')) },
                  { path: 'audit', ...page(() => import('@/pages/platform/audit-page')) },
                ],
              },
              { path: '/account', ...page(() => import('@/pages/account/account-page')) },
              { path: '/account/notifications', ...page(() => import('@/pages/account/account-page')) },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
