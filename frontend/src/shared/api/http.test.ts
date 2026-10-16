import { http as mswHttp, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { env } from '@/shared/config/env';
import { configureHttp, http, isApiError } from './http';
import { useSessionStore } from '@/features/auth/session-store';
import { installHttpBridge } from '@/app/providers/http-bridge';

const url = (p: string) => `${env.apiUrl}${p}`;

describe('http client', () => {
  it('unwraps the Laravel envelope with pagination', async () => {
    server.use(mswHttp.get(url('/x'), () => HttpResponse.json({ status: 'success', message: 'ok', data: [1, 2], pagination: { current_page: 1, last_page: 3, per_page: 2, total: 6 } })));
    const r = await http.get<number[]>('/x');
    expect(r.data).toEqual([1, 2]);
    expect(r.message).toBe('ok');
    expect(r.pagination?.last_page).toBe(3);
  });

  it('returns the whole body when there is no data key', async () => {
    server.use(mswHttp.get(url('/y'), () => HttpResponse.json({ status: 'success', qr_code_signature: 'abc' })));
    const r = await http.get<{ qr_code_signature: string }>('/y');
    expect(r.data.qr_code_signature).toBe('abc');
  });

  it('turns 422 into field errors', async () => {
    server.use(mswHttp.post(url('/z'), () => HttpResponse.json({ message: 'The title field is required.', errors: { title: ['The title field is required.'] } }, { status: 422 })));
    const err = await http.post('/z', {}).catch((e) => e);
    expect(isApiError(err)).toBe(true);
    expect(err.isValidation).toBe(true);
    expect(err.field('title')).toBe('The title field is required.');
  });

  it('ends the session on 401', async () => {
    installHttpBridge();
    useSessionStore.setState({ token: 't', user: { id: 1 } as never });
    server.use(mswHttp.get(url('/secure'), () => HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 })));
    await http.get('/secure').catch(() => undefined);
    expect(useSessionStore.getState().token).toBeNull();
    expect(useSessionStore.getState().endedReason).toBe('expired');
  });

  it('reports suspended organizations', async () => {
    const onSuspended = vi.fn();
    configureHttp({ onSuspended });
    server.use(mswHttp.get(url('/s'), () => HttpResponse.json({ error: 'Organization Suspended', message: 'Your organization account has been suspended.' }, { status: 403 })));
    await http.get('/s').catch(() => undefined);
    expect(onSuspended).toHaveBeenCalledWith('Your organization account has been suspended.');
    installHttpBridge();
  });

  it('sends the bearer token and JSON body', async () => {
    installHttpBridge();
    useSessionStore.setState({ token: 'secret-token' });
    let seen: { auth: string | null; body: unknown } = { auth: null, body: null };
    server.use(
      mswHttp.post(url('/echo'), async ({ request }) => {
        seen = { auth: request.headers.get('Authorization'), body: await request.json() };
        return HttpResponse.json({ data: true });
      }),
    );
    await http.post('/echo', { a: 1 });
    expect(seen).toEqual({ auth: 'Bearer secret-token', body: { a: 1 } });
  });

  it('wraps network failures', async () => {
    server.use(mswHttp.get(url('/down'), () => HttpResponse.error()));
    const err = await http.get('/down').catch((e) => e);
    expect(err.kind).toBe('network');
    expect(err.status).toBe(0);
  });
});
