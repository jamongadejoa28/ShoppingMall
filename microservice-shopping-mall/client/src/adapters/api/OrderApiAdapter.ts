import axios from 'axios'; // axios를 직접 import
import { API_BASE_URL } from '../../shared/constants/api'; // baseURL을 직접 import
import {
  IOrderRepository,
  CreateOrderData,
} from '../../entities/order/IOrderRepository';
import { useAuthStore } from '../../frameworks/state/authStore';
import { Order } from '../../entities/order/Order';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export class OrderApiAdapter implements IOrderRepository {
  async createOrder(data: CreateOrderData): Promise<Order> {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      throw new Error('인증 토큰이 없습니다. 로그인이 필요합니다.');
    }

    try {
      const response = await api.post<Order>('/orders', data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      console.error('주문 생성 실패:', error);
      throw new Error(
        error.response?.data?.message ||
          '주문을 생성하는 중에 문제가 발생했습니다.'
      );
    }
  }
}
