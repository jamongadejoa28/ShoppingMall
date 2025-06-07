import { useState, useEffect } from 'react';
import { apiClient } from '@shared/utils/api';
import { ApiResponse } from '@shared/types';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(
  url: string,
  options?: {
    immediate?: boolean;
    dependencies?: any[];
  }
): UseApiState<T> & {
  refetch: () => Promise<void>;
} {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: options?.immediate !== false,
    error: null,
  });

  const fetchData = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiClient.get<ApiResponse<T>>(url);
      setState({
        data: response.data.data,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setState({
        data: null,
        loading: false,
        error:
          error.response?.data?.error || error.message || '오류가 발생했습니다',
      });
    }
  };

  useEffect(() => {
    if (options?.immediate !== false) {
      fetchData();
    }
  }, options?.dependencies || []);

  return {
    ...state,
    refetch: fetchData,
  };
}
