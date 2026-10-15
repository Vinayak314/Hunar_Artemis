import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet, useRouter, type ErrorComponentProps } from '@tanstack/react-router';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: RootError,
});

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">यह पेज नहीं मिला · Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you are looking for does not exist or has moved.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          होम · Go home
        </Link>
      </div>
    </div>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">पेज लोड नहीं हुआ · This page did not load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please check your connection and try again.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              void router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            फिर कोशिश करें · Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            होम · Go home
          </a>
        </div>
      </div>
    </div>
  );
}
