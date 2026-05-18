import * as React from "react";

/**
 * useTimedLoading — wraps any async loading state with a maximum timeout.
 *
 * If `loading` is still true after `maxMs` (default 1000ms), this hook
 * returns `false` so the UI can render an empty state instead of spinning
 * forever.
 *
 * Usage:
 *   const stillLoading = useTimedLoading(supabaseLoading, 1000);
 *   if (stillLoading) return <Spinner />;
 *   if (data.length === 0) return <EmptyState />;
 */
export function useTimedLoading(loading: boolean, maxMs = 1000): boolean {
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }
    const id = setTimeout(() => setTimedOut(true), maxMs);
    return () => clearTimeout(id);
  }, [loading, maxMs]);

  return loading && !timedOut;
}
