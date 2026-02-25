import { useState, useCallback, useEffect, useRef } from 'react';

export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!cancelled && mountedRef.current) {
          setData(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled && mountedRef.current) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey, ...deps]);

  return { data, isLoading, error, refresh };
}
