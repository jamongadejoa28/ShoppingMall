import { Order } from './Order';
import { Address, PaymentMethod } from '@shared/types';

export interface CreateOrderData {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  shippingAddress: Address;
  paymentMethod: PaymentMethod;
}

export interface IOrderRepository {
  createOrder(data: CreateOrderData): Promise<Order>;
  getOrders(userId: string): Promise<Order[]>;
  getOrderById(id: string): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order>;
  cancelOrder(id: string): Promise<Order>;
}
