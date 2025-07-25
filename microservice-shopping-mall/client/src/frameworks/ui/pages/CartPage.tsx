// CartPage.tsx - 장바구니 페이지 UI 및 로직
// Clean Architecture: UI Pages Layer
// 위치: client/src/frameworks/ui/pages/CartPage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CartApiAdapter } from '../../../adapters/api/CartApiAdapter';
import ConfirmDialog from '../components/ConfirmDialog';

// =======================================
// Types & Interfaces
// =======================================

interface CartProduct {
  id: string;
  name: string;
  price: number;
  brand: string;
  sku: string;
  slug: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  inventory: {
    availableQuantity: number;
    status: string;
  };
  imageUrls: string[];
}

interface CartItem {
  product: CartProduct;
  quantity: number;
  addedAt: string;
}

interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  totalAmount: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
}

// =======================================
// CartPage Component
// =======================================

const CartPage: React.FC = () => {
  // =======================================
  // State Management
  // =======================================

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk';
    productId?: string;
    productName?: string;
  }>({ isOpen: false, type: 'single' });

  // CartApiAdapter를 useMemo로 메모이제이션하여 재생성 방지
  const cartApi = useMemo(() => new CartApiAdapter(), []);

  // =======================================
  // API Functions
  // =======================================

  const fetchCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cartData = await cartApi.getCart();
      setCart(cartData);
      // 기본적으로 모든 아이템을 선택 상태로 설정 (안전한 처리)
      if (cartData && cartData.items && cartData.items.length > 0) {
        const allItemIds = cartData.items.map(item => item.product.id);
        setSelectedItems(new Set(allItemIds));
      } else {
        setSelectedItems(new Set());
      }
    } catch (err: any) {
      // 장바구니가 비어있는 경우는 에러가 아니므로 빈 장바구니로 설정
      setCart({
        id: '',
        items: [],
        totalAmount: 0,
        totalQuantity: 0,
        createdAt: '',
        updatedAt: '',
      });
      setSelectedItems(new Set());
      // 토스트 에러 메시지 제거
    } finally {
      setLoading(false);
    }
  }, [cartApi]); // cartApi 종속성 추가

  const handleRemoveItem = useCallback(
    async (productId: string, productName?: string) => {
      setConfirmDialog({
        isOpen: true,
        type: 'single',
        productId,
        productName,
      });
    },
    []
  );

  const confirmRemoveItem = useCallback(async () => {
    if (!confirmDialog.productId) return;

    try {
      await cartApi.removeFromCart(confirmDialog.productId);
      toast.success('상품을 삭제했습니다.');
      // 장바구니 다시 로드
      fetchCart();
      // 선택된 아이템에서 제거
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(confirmDialog.productId!);
        return newSet;
      });
    } catch (error: any) {
      toast.error(error.message || '상품 삭제 중 오류가 발생했습니다.');
    } finally {
      setConfirmDialog({ isOpen: false, type: 'single' });
    }
  }, [confirmDialog.productId, fetchCart, cartApi]);

  // =======================================
  // Effects
  // =======================================

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // =======================================
  // Event Handlers
  // =======================================

  const handleSelectItem = (productId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedItems(newSelection);
  };

  const handleSelectAll = () => {
    if (cart && selectedItems.size === cart.items.length) {
      setSelectedItems(new Set()); // 전체 선택 해제
    } else {
      const allProductIds = cart?.items.map(item => item.product.id) || [];
      setSelectedItems(new Set(allProductIds)); // 전체 선택
    }
  };

  const handleRemoveSelected = useCallback(async () => {
    if (selectedItems.size === 0) {
      toast.error('삭제할 상품을 선택해주세요.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      type: 'bulk',
    });
  }, [selectedItems]);

  const confirmRemoveSelected = useCallback(async () => {
    try {
      // 선택된 상품들을 순차적으로 삭제
      const deletePromises = Array.from(selectedItems).map(productId =>
        cartApi.removeFromCart(productId)
      );

      await Promise.all(deletePromises);
      toast.success('선택된 상품들을 삭제했습니다.');

      // 장바구니 다시 로드
      fetchCart();
      // 선택 상태 초기화
      setSelectedItems(new Set());
    } catch (error: any) {
      toast.error(error.message || '상품 삭제 중 오류가 발생했습니다.');
    } finally {
      setConfirmDialog({ isOpen: false, type: 'bulk' });
    }
  }, [selectedItems, cartApi, fetchCart]);

  const handleUpdateQuantity = useCallback(
    async (productId: string, newQuantity: number) => {
      if (newQuantity <= 0) {
        const item = cart?.items.find(item => item.product.id === productId);
        return handleRemoveItem(productId, item?.product.name);
      }

      try {
        await cartApi.updateQuantity(productId, newQuantity);
        toast.success('수량을 변경했습니다.');
        // 장바구니 다시 로드
        fetchCart();
      } catch (error: any) {
        toast.error(error.message || '수량 변경 중 오류가 발생했습니다.');
      }
    },
    [fetchCart, handleRemoveItem, cartApi, cart]
  );

  const handleCheckout = () => {
    // TODO: 주문/결제 페이지로 이동
    toast.error('로그인 후 이용해주세요.');
  };

  // =======================================
  // Render Helpers
  // =======================================

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const selectedItemsPrice =
    cart?.items
      .filter(item => selectedItems.has(item.product.id))
      .reduce((sum, item) => sum + item.product.price * item.quantity, 0) || 0;

  // =======================================
  // Loading & Error States
  // =======================================

  if (loading) {
    return (
      <div className="container mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">장바구니를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8 text-center bg-red-50 rounded-lg">
        <p className="text-red-600 font-semibold">오류가 발생했습니다.</p>
        <p className="text-red-500 mt-2">{error}</p>
        <button
          onClick={fetchCart}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-3xl font-bold mb-4">장바구니</h1>
        <p className="text-gray-500 mb-8">장바구니가 비어 있습니다.</p>
        <Link
          to="/products"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          쇼핑 계속하기
        </Link>
      </div>
    );
  }

  // =======================================
  // Main Render
  // =======================================

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">장바구니</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 장바구니 목록 */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="selectAll"
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={
                    cart.items.length > 0 &&
                    selectedItems.size === cart.items.length
                  }
                  onChange={handleSelectAll}
                />
                <label htmlFor="selectAll" className="ml-3 text-sm font-medium">
                  전체선택 ({selectedItems.size}/{cart.items.length})
                </label>
              </div>
              <button
                onClick={handleRemoveSelected}
                className="text-sm text-gray-500 hover:text-red-600"
              >
                선택 삭제
              </button>
            </div>

            {/* 아이템 목록 */}
            <div className="space-y-4">
              {cart.items.map(item => (
                <div
                  key={item.product.id}
                  className="flex items-start gap-4 border-b py-4"
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-2"
                    checked={selectedItems.has(item.product.id)}
                    onChange={() => handleSelectItem(item.product.id)}
                  />
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0">
                    <img
                      src={
                        item.product.imageUrls[0] ||
                        `https://via.placeholder.com/150?text=${item.product.name}`
                      }
                      alt={item.product.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm text-gray-500">
                      {item.product.brand}
                    </p>
                    <p className="font-medium">{item.product.name}</p>
                    <div className="flex items-center mt-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            handleUpdateQuantity(
                              item.product.id,
                              item.quantity - 1
                            )
                          }
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 border rounded flex items-center justify-center disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="w-12 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleUpdateQuantity(
                              item.product.id,
                              item.quantity + 1
                            )
                          }
                          disabled={
                            item.quantity >=
                            item.product.inventory.availableQuantity
                          }
                          className="w-8 h-8 border rounded flex items-center justify-center disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                    <p className="text-sm text-gray-500">
                      단가: {formatPrice(item.product.price)}
                    </p>
                    <button
                      onClick={() =>
                        handleRemoveItem(item.product.id, item.product.name)
                      }
                      className="text-xs text-gray-400 hover:text-red-600 mt-2"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 주문 요약 */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow sticky top-24">
              <h2 className="text-xl font-bold border-b pb-4 mb-4">
                주문 요약
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>총 상품 금액</span>
                  <span>{formatPrice(selectedItemsPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>배송비</span>
                  <span>
                    {selectedItemsPrice > 50000 ? '무료' : formatPrice(3000)}
                  </span>
                </div>
              </div>
              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>총 결제 금액</span>
                  <span>
                    {formatPrice(
                      selectedItemsPrice +
                        (selectedItemsPrice > 50000 ? 0 : 3000)
                    )}
                  </span>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={selectedItems.size === 0}
                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300"
              >
                {selectedItems.size}개 상품 구매하기
              </button>
              <Link
                to="/products"
                className="w-full mt-3 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 text-center block"
              >
                쇼핑 계속하기
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="상품 삭제"
        message={
          confirmDialog.type === 'single'
            ? `'${confirmDialog.productName || '선택한 상품'}'을 삭제하시겠습니까?`
            : `선택한 ${selectedItems.size}개 상품을 삭제하시겠습니까?`
        }
        confirmText="삭제"
        cancelText="취소"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={
          confirmDialog.type === 'single'
            ? confirmRemoveItem
            : confirmRemoveSelected
        }
        onCancel={() => setConfirmDialog({ isOpen: false, type: 'single' })}
      />
    </div>
  );
};

export default CartPage;
