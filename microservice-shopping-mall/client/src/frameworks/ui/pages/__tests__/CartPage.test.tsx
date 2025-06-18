import { CartProduct } from '@/types/cart-type/CartProduct';
import { OrderApiAdapter } from '@adapters/api/OrderApiAdapter';
import { useAuthStore } from '@frameworks/state/authStore';
import { useCartStore } from '@frameworks/state/cartStore';
import { ROUTES } from '@shared/constants/routes';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CartPage } from '../CartPage';

jest.mock('@adapters/api/OrderApiAdapter');

// ✅ Product 타입과 일치하는 mockProduct 정의
const mockProduct: CartProduct = {
  id: 'prod-1',
  name: 'Test Product',
  description: '테스트 상품입니다.',
  price: 100,
  brand: 'Test Brand',
  sku: 'SKU123',
  slug: 'test-product',
  imageUrls: ['http://example.com/image.png'],
  category: {
    id: 'cat-1',
    name: 'Test Category',
    slug: 'test-category',
  },
  inventory: {
    availableQuantity: 10,
    status: 'in_stock',
  },
};

const setup = (isLoggedIn: boolean) => {
  useCartStore.setState(
    {
      items: [
        {
          product: mockProduct,
          quantity: 1,
          addedAt: new Date(),
        },
      ],
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
      clearCart: jest.fn(),
      getTotalQuantity: () => 1,
      getTotalPrice: () => 100,
      getItemCount: () => 1,
      isEmpty: () => false,
      getItem: () => undefined,
      hasItem: () => true,
      getItemQuantity: () => 1,
    },
    true
  );

  useAuthStore.setState(
    {
      isAuthenticated: isLoggedIn,
      token: isLoggedIn ? 'fake-token' : null,
      user: isLoggedIn
        ? {
            id: 'user-123',
            name: 'Test User',
            email: 'test@test.com',
            role: 'USER',
          }
        : null,
      login: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    },
    true // 전체 교체
  );

  render(
    <MemoryRouter initialEntries={[ROUTES.CART]}>
      <Routes>
        <Route path={ROUTES.CART} element={<CartPage />} />
        <Route path={ROUTES.LOGIN} element={<div>로그인 페이지</div>} />
        <Route path={ROUTES.ORDERS} element={<div>주문 내역 페이지</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('CartPage', () => {
  const mockCreateOrder = jest.fn().mockResolvedValue({ id: 'order-123' });

  beforeEach(() => {
    jest.clearAllMocks();
    (OrderApiAdapter as jest.Mock).mockImplementation(() => ({
      createOrder: mockCreateOrder,
    }));
  });

  test('비로그인 상태에서 "구매하기" 버튼을 클릭하면 로그인 페이지로 이동해야 한다.', () => {
    setup(false);
    fireEvent.click(screen.getByRole('button', { name: /구매하기/i }));
    expect(screen.getByText('로그인 페이지')).toBeInTheDocument();
  });

  test('로그인 상태에서 "구매하기" 버튼을 클릭하면 주문을 생성한다.', async () => {
    setup(true);
    fireEvent.click(screen.getByRole('button', { name: /구매하기/i }));

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith({
        items: [{ productId: 'prod-1', quantity: 1 }],
        shippingAddress: 'temp address',
        paymentMethod: 'credit_card',
      });
    });
  });
});
