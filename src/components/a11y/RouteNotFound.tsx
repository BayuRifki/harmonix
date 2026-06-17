import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import { useLocation } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

/**
 * Recovery screen for unknown routes.
 *
 * Mounted behind a `<Route path="*">` catch-all in both the main
 * shell and the `/now-playing` branch of `App.tsx`. Without this, a
 * mistyped URL / stale bookmark / outdated deep link renders the app
 * chrome with no content and no guidance.
 *
 * Offers two recovery paths: jump straight to Home, or step back one
 * entry in history (falling back to Home when there is nowhere to go).
 */
export function RouteNotFound(): JSX.Element {
  const navigate = useSafeNavigate();
  const location = useLocation();

  const canGoBack =
    typeof window !== 'undefined' && typeof window.history !== 'undefined'
      ? window.history.length > 1
      : false;

  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]" data-testid="route-not-found">
      <EmptyState
        icon={<Compass size={24} />}
        title="Page not found"
        description="The link may be outdated, mistyped, or moved."
        action={
          <>
            <p className="text-xs text-zinc-500 mb-3">
              We couldn&apos;t find a page at{' '}
              <code className="text-brand-400">{location.pathname}</code>.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="ghost" onClick={() => (canGoBack ? navigate(-1) : navigate('/'))}>
                <ArrowLeft size={14} /> Go back
              </Button>
              <Button variant="primary" onClick={() => navigate('/')}>
                <Home size={14} /> Back to Home
              </Button>
            </div>
          </>
        }
      />
    </div>
  );
}
