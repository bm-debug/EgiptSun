import { useEffect, useState, useCallback } from 'react';
import { ApiKey, ResponseOf, PathParamsOf } from '@/hooks/api/api.types';
import { apiMethods } from './apiMethods';

/**
 * useQuery — GET запрос с pathParams
 */
export function useQuery<K extends ApiKey>(
  key: K,
  params?: PathParamsOf<K>,      // GET path params
  options?: { immediate?: boolean }
) {
  const [data, setData] = useState<ResponseOf<K> | null>(null);
  const [loading, setLoading] = useState(() => (options?.immediate ?? true));
  const [error, setError] = useState<unknown>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // строим URL через apiMethods
      const urlBuilder = apiMethods[key].url as (params?: any) => string;
      const url = urlBuilder(params);

      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) throw new Error(res.statusText);

      const json = (await res.json()) as ResponseOf<K>;
      setData(json);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [key, JSON.stringify(params)]);

  useEffect(() => {
    if (options?.immediate ?? true) {
      fetchData();
    }
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
