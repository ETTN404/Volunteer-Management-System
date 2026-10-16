import { env } from '@/shared/config/env';
import type { Pagination } from '@/shared/types/api';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface ApiResult<T> {
  data: T;
  message?: string;
  pagination?: Pagination;
  status: number;
  /** Full JSON body, for endpoints that return fields beside `data` (e.g. `valid`, `is_active`). */
  raw: Record<string, unknown>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;
  readonly body: Record<string, unknown>;
  readonly kind: 'network' | 'timeout' | 'http';

  constructor(opts: {
    message: string;
    status: number;
    kind: ApiError['kind'];
    fieldErrors?: Record<string, string[]>;
    body?: Record<string, unknown>;
  }) {
    super(opts.message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.kind = opts.kind;
    this.fieldErrors = opts.fieldErrors ?? {};
    this.body = opts.body ?? {};
  }

  get isValidation() {
    return this.status === 422;
  }
  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
  /** Laravel's NotFoundHttpException (route doesn't exist) — the backend hasn't shipped this endpoint yet. */
  get isRouteMissing() {
    return this.status === 404 && this.message === 'Resource not found.';
  }
  /** First message for a field, for inline form errors. */
  field(name: string): string | undefined {
    return this.fieldErrors[name]?.[0];
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

/** Human-readable message for any thrown value. */
export const NOT_AVAILABLE = 'This feature isn’t available on the server yet.';

export function isRouteMissing(e: unknown): boolean {
  return isApiError(e) && e.isRouteMissing;
}

export function errorMessage(e: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (isApiError(e) && e.isRouteMissing) return NOT_AVAILABLE;
  if (isApiError(e)) return e.message || fallback;
  if (e instanceof Error) return e.message || fallback;
  return fallback;
}

/* ------------------------------------------------------------------ */
/* Runtime hooks registered by the app layer (keeps shared/ free of     */
/* feature imports).                                                    */
/* ------------------------------------------------------------------ */

interface HttpHooks {
  getToken: () => string | null;
  onUnauthorized: () => void;
  onSuspended: (message: string) => void;
}

let hooks: HttpHooks = {
  getToken: () => null,
  onUnauthorized: () => {},
  onSuspended: () => {},
};

export function configureHttp(next: Partial<HttpHooks>) {
  hooks = { ...hooks, ...next };
}

/* ------------------------------------------------------------------ */
/* Slow-request tracking: lets the UI explain Render cold starts.       */
/* ------------------------------------------------------------------ */

type SlowListener = (slowCount: number) => void;
const slowListeners = new Set<SlowListener>();
let slowCount = 0;
const SLOW_AFTER_MS = 3500;

export function subscribeSlowRequests(listener: SlowListener) {
  slowListeners.add(listener);
  listener(slowCount);
  return () => {
    slowListeners.delete(listener);
  };
}
function setSlow(delta: number) {
  slowCount = Math.max(0, slowCount + delta);
  slowListeners.forEach((l) => l(slowCount));
}

/* ------------------------------------------------------------------ */

export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Return the Response untouched (file downloads). */
  asBlob?: boolean;
  /** Skip the global 401 handler (used by the login call itself). */
  skipAuthRedirect?: boolean;
}

export function buildUrl(path: string, query?: RequestOptions['query']): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${env.apiUrl}${clean}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function laravelMessage(json: Record<string, unknown>, status: number): string {
  const msg = typeof json.message === 'string' ? json.message : undefined;
  const err = typeof json.error === 'string' ? json.error : undefined;
  if (status === 422 && json.errors && typeof json.errors === 'object') {
    const first = Object.values(json.errors as Record<string, string[]>)[0]?.[0];
    if (first) return first;
  }
  if (msg) return msg;
  if (err) return err;
  switch (status) {
    case 401:
      return 'Your session has ended. Sign in again.';
    case 403:
      return 'You do not have access to this.';
    case 404:
      return 'That item no longer exists.';
    case 429:
      return 'Too many attempts. Wait a minute and try again.';
    default:
      return status >= 500 ? 'The server hit a problem. Try again in a moment.' : 'Request failed.';
  }
}

export async function request<T>(method: HttpMethod, path: string, opts: RequestOptions = {}): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = hooks.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  const controller = new AbortController();
  const onAbort = () => controller.abort(opts.signal?.reason);
  opts.signal?.addEventListener('abort', onAbort);
  const timeout = setTimeout(() => controller.abort('timeout'), opts.timeoutMs ?? 45_000);
  let markedSlow = false;
  const slowTimer = setTimeout(() => {
    markedSlow = true;
    setSlow(1);
  }, SLOW_AFTER_MS);

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), { method, headers, body, signal: controller.signal });
  } catch (e) {
    const timedOut = controller.signal.reason === 'timeout';
    if (opts.signal?.aborted) throw e;
    throw new ApiError({
      status: 0,
      kind: timedOut ? 'timeout' : 'network',
      message: timedOut
        ? 'The server took too long to answer. It may be waking up — try again.'
        : 'Can’t reach the server. Check your connection and try again.',
    });
  } finally {
    clearTimeout(timeout);
    clearTimeout(slowTimer);
    if (markedSlow) setSlow(-1);
    opts.signal?.removeEventListener('abort', onAbort);
  }

  if (opts.asBlob && res.ok) {
    const blob = await res.blob();
    return { data: blob as T, status: res.status, raw: {} };
  }

  const json = ((await res.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;

  if (!res.ok) {
    const message = laravelMessage(json, res.status);
    if (res.status === 401 && !opts.skipAuthRedirect) hooks.onUnauthorized();
    if (res.status === 403 && json.error === 'Organization Suspended') hooks.onSuspended(message);
    throw new ApiError({
      status: res.status,
      kind: 'http',
      message,
      fieldErrors: (json.errors as Record<string, string[]>) ?? {},
      body: json,
    });
  }

  return {
    data: ('data' in json ? json.data : json) as T,
    message: typeof json.message === 'string' ? json.message : undefined,
    pagination: json.pagination as Pagination | undefined,
    status: res.status,
    raw: json,
  };
}

export const http = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PATCH', path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PUT', path, { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
};
