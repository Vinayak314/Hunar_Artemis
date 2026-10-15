/** Thin fetch wrapper for the Hunar API. Session auth rides on an httpOnly cookie. */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

// Empty means same origin (Vite proxy in development, the API server in production).
const BASE: string = import.meta.env.VITE_API_BASE ?? '';

type Method = 'GET' | 'POST' | 'PATCH';

export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const init: RequestInit = { method, credentials: 'include', headers };
  if (method !== 'GET') {
    // The server rejects non-JSON writes (CSRF guard), so always send a JSON body.
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body ?? {});
  }

  let res: Response;
  try {
    res = await fetch(BASE + path, init);
  } catch {
    throw new ApiError(0, 'network', 'No internet connection. Check your network and try again.');
  }
  if (res.status === 204) return undefined as T;

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; fields?: ApiError['fields'] } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? 'error', err?.message ?? 'Something went wrong.', err?.fields ?? []);
  }
  return data as T;
}
