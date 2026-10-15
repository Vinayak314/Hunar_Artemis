import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { HunarShell } from '@/components/hunar-shell';
import { meQuery } from '@/lib/queries';

/** Layout for every signed-in page. Unauthenticated visitors are sent to /login. */
export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me) throw redirect({ to: '/login', search: { redirect: location.href } });
    return { me };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  return (
    <HunarShell>
      <Outlet />
    </HunarShell>
  );
}
