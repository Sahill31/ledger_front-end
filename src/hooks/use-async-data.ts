import * as React from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** Tiny async data hook for service calls (loading / error / reload state). */
export function useAsyncData<T>(fn: () => Promise<T>, deps: React.DependencyList = []): AsyncState<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFn = React.useCallback(fn, deps);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    stableFn()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stableFn, tick]);

  return { data, loading, error, reload: () => setTick((t) => t + 1) };
}
