import { useQuery } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { meQuery } from './queries';
import type { Me } from './types';

/**
 * The signed-in user inside the /_authed layout. The layout guarantees a user
 * exists; the query cache keeps it fresh after profile edits.
 */
export function useMe(): Me {
  const ctx = useRouteContext({ from: '/_authed' });
  const { data } = useQuery(meQuery);
  return data ?? ctx.me;
}

/** Only allow same-site paths as post-login redirects (no open redirects). */
export function safeRedirect(target: unknown): string | null {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : null;
}
