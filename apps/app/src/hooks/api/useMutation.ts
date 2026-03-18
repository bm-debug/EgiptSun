import { useState } from 'react';

import { ApiKey, ResponseOf, PathParamsOf, BodyOf, MethodOf } from '@/hooks/api/api.types';
import { apiMethods } from './apiMethods';


export function useMutation<K extends ApiKey>(key: K) {
  const [data, setData] = useState<ResponseOf<K> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  /**
   * execute(body, params?) — body для POST/PUT/DELETE, params для pathParams
   */
  const execute = async (body: BodyOf<K>, params?: PathParamsOf<K>) => {
    try {
      setLoading(true);
      setError(null);

      // строим URL
      const urlBuilder = apiMethods[key].url as (params?: any) => string;
      const url = urlBuilder(params);

      const res = await fetch(url, {
        method: apiMethods[key].method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) throw new Error(res.statusText);

      const json = (await res.json()) as ResponseOf<K>;
      setData(json);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  return {
    execute,
    data,
    loading,
    error,
  };
}
