import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '@/app/providers/app-providers';
import { routes } from '@/app/router';
import { signInAs } from './auth';

/**
 * Render the real app (router + providers + mock backend) at a URL, optionally signed in.
 * Exercises pages exactly as users reach them — guards, layouts, lazy routes and all.
 */
export async function renderApp(url: string, opts: { as?: string } = {}) {
  if (opts.as) await signInAs(opts.as);
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  const user = userEvent.setup();
  const utils = render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...utils, router, user, screen };
}
