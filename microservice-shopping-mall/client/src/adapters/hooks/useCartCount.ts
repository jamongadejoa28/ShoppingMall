// useCartCount.ts - 장바구니 아이템 개수를 실시간으로 추적하는 커스텀 훅
// Clean Architecture: Adapters Layer
// 위치: client/src/adapters/hooks/useCartCount.ts

import { useState, useEffect, useCallback } from 'react';
import { CartApiAdapter } from '../api/CartApiAdapter';

/**
 * 장바구니 아이템 개수를 실시간으로 추적하는 커스텀 훅
 *
 * @returns {Object} - cart count와 refresh 함수
 */
export const useCartCount = () => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const cartApi = new CartApiAdapter();

  const fetchCartCount = useCallback(async () => {
    try {
      const cart = await cartApi.getCart();
      setCount(cart.totalQuantity || 0);
    } catch (error) {
      // 장바구니가 비어있거나 오류 발생 시 0으로 설정
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [cartApi]);

  const refresh = useCallback(() => {
    fetchCartCount();
  }, [fetchCartCount]);

  useEffect(() => {
    fetchCartCount();
  }, [fetchCartCount]);

  return {
    count,
    loading,
    refresh,
  };
};
