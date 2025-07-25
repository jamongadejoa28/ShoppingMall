// ProductDetailPage.tsx - API 응답 구조에 맞춰 수정된 상품 상세 페이지
// Clean Architecture: UI Pages Layer
// 위치: client/src/frameworks/ui/pages/ProductDetailPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCartActions } from '../../state/cartStore';
import AddToCartModal from '../components/AddToCartModal';
import { CartApiAdapter } from '../../../adapters/api/CartApiAdapter';
import { CartProduct } from '../../../types/cart-type/CartProduct';

// ========================================
// Types & Interfaces (실제 API 응답에 맞춤)
// ========================================

interface ProductDetailData {
  id: string;
  name: string;
  description: string;
  price: number;
  sku: string;
  brand: string;
  tags: string[];
  isActive: boolean;
  slug: string;
  discountPrice?: number;
  category: {
    id: string;
    name: string;
    slug: string;
    description: string;
    isActive: boolean;
  };
  inventory: {
    availableQuantity: number;
    reservedQuantity: number;
    status: string;
    lowStockThreshold: number;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: ProductDetailData;
  timestamp: string;
  requestId: string;
}

// ========================================
// ProductDetailPage Component
// ========================================

const ProductDetailPage: React.FC = () => {
  // ========================================
  // State Management
  // ========================================

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCartActions();

  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);
  const [showAddToCartModal, setShowAddToCartModal] = useState<boolean>(false);

  // ========================================
  // API Functions
  // ========================================

  const fetchProductDetail = useCallback(async (productId: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching product:', productId); // 디버깅용

      const response = await fetch(
        `http://localhost:3001/api/v1/products/${productId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('상품을 찾을 수 없습니다.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      console.log('API Response:', data); // 디버깅용

      if (data.success) {
        setProduct(data.data);
      } else {
        throw new Error(data.message || '상품 정보를 불러오는데 실패했습니다.');
      }
    } catch (err: any) {
      const errorMessage =
        err.message || '상품 정보를 불러오는 중 오류가 발생했습니다.';
      setError(errorMessage);
      console.error('API Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================================
  // Event Handlers
  // ========================================

  const handleQuantityChange = useCallback(
    (value: number) => {
      const maxQuantity = product?.inventory?.availableQuantity || 1;
      const newQuantity = Math.max(1, Math.min(value, maxQuantity));
      setQuantity(newQuantity);
    },
    [product?.inventory?.availableQuantity]
  );

  const handleAddToCart = useCallback(async () => {
    if (!product || isAddingToCart) return;

    try {
      setIsAddingToCart(true);

      // CartApiAdapter를 사용하여 장바구니에 추가
      const cartApi = new CartApiAdapter();
      await cartApi.addToCart(product.id, quantity);

      // 성공 시 모달 표시
      setShowAddToCartModal(true);

      // 로컬 상태도 업데이트 (UI 반영용)
      const cartProduct: CartProduct = {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.discountPrice || product.price,
        brand: product.brand,
        sku: product.sku,
        slug: product.slug || '',
        category: {
          id: product.category?.id || '',
          name: product.category?.name || '',
          slug: product.category?.slug || '',
        },
        inventory: {
          availableQuantity: product.inventory?.availableQuantity || 0,
          status: (product.inventory?.status === 'out_of_stock'
            ? 'out_of_stock'
            : 'in_stock') as 'in_stock' | 'out_of_stock',
        },
        imageUrls: [],
      };

      addItem(cartProduct, quantity);

      console.log(`장바구니 추가 성공: ${product.name} x${quantity}`);
    } catch (error: any) {
      console.error('장바구니 추가 실패:', error);

      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        '장바구니 추가 중 오류가 발생했습니다.';

      toast.error(errorMessage, {
        duration: 4000,
        icon: '❌',
      });
    } finally {
      setIsAddingToCart(false);
    }
  }, [product, isAddingToCart, addItem, quantity]);

  const handleBuyNow = useCallback(() => {
    if (!product) return;

    // TODO: 로그인 시스템 구현 후 주문 페이지로 이동
    toast.error('로그인 후 이용해주세요.', {
      duration: 3000,
      icon: '🔒',
    });
  }, [product]);

  const handleBackToList = useCallback(() => {
    navigate('/products');
  }, [navigate]);

  // ========================================
  // Effects
  // ========================================

  useEffect(() => {
    if (id) {
      fetchProductDetail(id);
    } else {
      setError('상품 ID가 제공되지 않았습니다.');
      setLoading(false);
    }
  }, [id, fetchProductDetail]);

  // ========================================
  // Render Helpers
  // ========================================

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const getStockStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'in_stock':
      case 'sufficient':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'low_stock':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'out_of_stock':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStockStatusText = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'in_stock':
      case 'sufficient':
        return '재고 충분';
      case 'low_stock':
        return '재고 부족';
      case 'out_of_stock':
        return '품절';
      default:
        return '재고 확인 중';
    }
  };

  const calculateDiscountRate = (): number => {
    if (!product?.discountPrice) {
      return 0;
    }
    return Math.round(
      ((product.price - product.discountPrice) / product.price) * 100
    );
  };

  const isOutOfStock = (): boolean => {
    return (
      product?.inventory?.status?.toLowerCase() === 'out_of_stock' ||
      (product?.inventory?.availableQuantity || 0) <= 0
    );
  };

  const isLowStock = (): boolean => {
    return (
      product?.inventory?.status?.toLowerCase() === 'low_stock' ||
      (product?.inventory?.availableQuantity || 0) <=
        (product?.inventory?.lowStockThreshold || 0)
    );
  };

  // ========================================
  // Loading & Error States
  // ========================================

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <svg
            className="h-16 w-16 mx-auto mb-4 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-red-900 mb-2">
            오류가 발생했습니다
          </h3>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => id && fetchProductDetail(id)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={handleBackToList}
              className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              상품 목록으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">
            상품 정보를 찾을 수 없습니다
          </h3>
          <button
            onClick={handleBackToList}
            className="mt-4 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            상품 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // Main Render
  // ========================================

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 뒤로가기 버튼 */}
      <div className="mb-6">
        <button
          onClick={handleBackToList}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg
            className="h-5 w-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          상품 목록으로
        </button>
      </div>

      {/* 카테고리 경로 */}
      <nav className="mb-6">
        <ol className="flex items-center space-x-2 text-sm text-gray-500">
          <li>홈</li>
          <li>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </li>
          <li>{product.category?.name || '카테고리'}</li>
        </ol>
      </nav>

      {/* 상품 상세 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 상품 이미지 섹션 */}
        <div className="space-y-4">
          {/* 메인 이미지 */}
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            <svg
              className="h-32 w-32 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>

          {/* 썸네일 이미지들 */}
          <div className="flex space-x-2">
            {[1, 2, 3, 4].map(index => (
              <div
                key={index}
                className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center"
              >
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* 상품 정보 섹션 */}
        <div className="space-y-6">
          {/* 카테고리 태그와 추가 태그 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              {product.category?.name || '카테고리'}
            </span>
            {product.tags &&
              product.tags.length > 0 &&
              product.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className={`text-sm font-medium px-3 py-1 rounded-full border ${
                    index === 0
                      ? 'text-blue-600 bg-blue-50 border-blue-200'
                      : 'text-green-600 bg-green-50 border-green-200'
                  }`}
                >
                  {tag}
                </span>
              ))}
          </div>

          {/* 상품명과 브랜드 */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>
            <p className="text-lg text-gray-600">{product.brand}</p>
          </div>

          {/* 가격 정보 */}
          <div className="border-t border-b border-gray-200 py-6">
            {product.discountPrice ? (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl font-bold text-red-600">
                    {formatPrice(product.discountPrice)}
                  </span>
                  <span className="text-sm bg-red-100 text-red-600 px-2 py-1 rounded font-medium">
                    {calculateDiscountRate()}% 할인
                  </span>
                </div>
                <span className="text-lg text-gray-500 line-through">
                  {formatPrice(product.price)}
                </span>
              </div>
            ) : (
              <span className="text-3xl font-bold text-gray-900">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {/* 재고 상태 */}
          {product.inventory && (
            <div
              className={`p-4 rounded-lg border ${getStockStatusColor(
                product.inventory.status
              )}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  {getStockStatusText(product.inventory.status)}
                </span>
                <span className="text-sm">
                  재고: {product.inventory.availableQuantity}개
                </span>
              </div>
              {isLowStock() && !isOutOfStock() && (
                <p className="text-sm">재고가 부족합니다. 서둘러 주문하세요!</p>
              )}
            </div>
          )}

          {/* 수량 선택 */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="quantity"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                수량
              </label>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
                  </svg>
                </button>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max={product.inventory?.availableQuantity || 1}
                  value={quantity}
                  onChange={e =>
                    handleQuantityChange(parseInt(e.target.value) || 1)
                  }
                  className="w-20 text-center border border-gray-300 rounded-lg py-2"
                />
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={
                    quantity >= (product.inventory?.availableQuantity || 1)
                  }
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* 구매 버튼들 */}
            <div className="space-y-3">
              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock()}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isOutOfStock() ? '품절' : '바로 구매'}
              </button>

              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock() || isAddingToCart}
                className="w-full border border-blue-600 text-blue-600 py-3 px-6 rounded-lg font-medium hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isAddingToCart ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    추가 중...
                  </>
                ) : (
                  '장바구니 담기'
                )}
              </button>
            </div>
          </div>

          {/* 상품 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">상품 정보</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">SKU:</span>
                <span className="ml-2 font-medium">{product.sku}</span>
              </div>
              <div>
                <span className="text-gray-600">브랜드:</span>
                <span className="ml-2 font-medium">{product.brand}</span>
              </div>
            </div>
          </div>

          {/* 태그 */}
          {product.tags && product.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">태그</h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 상품 설명 */}
      <div className="mt-12 border-t border-gray-200 pt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">상품 설명</h2>
        <div className="prose max-w-none">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>
      </div>

      {/* 추가 정보 */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 배송 정보 */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">배송 정보</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• 무료배송 (5만원 이상 구매 시)</p>
            <p>• 평일 오후 2시 이전 주문 시 당일 출고</p>
            <p>• 배송기간: 1-2일 (주말/공휴일 제외)</p>
          </div>
        </div>

        {/* 교환/반품 */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">교환/반품</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• 14일 이내 교환/반품 가능</p>
            <p>• 상품 하자 시 무료 교환/반품</p>
            <p>• 단순 변심 시 배송비 고객 부담</p>
          </div>
        </div>
      </div>

      {/* AddToCartModal */}
      {product && (
        <AddToCartModal
          isOpen={showAddToCartModal}
          onClose={() => setShowAddToCartModal(false)}
          product={{
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.discountPrice || product.price,
            brand: product.brand,
            sku: product.sku,
            slug: product.slug || '',
            category: {
              id: product.category?.id || '',
              name: product.category?.name || '',
              slug: product.category?.slug || '',
            },
            inventory: {
              availableQuantity: product.inventory?.availableQuantity || 0,
              status: (product.inventory?.status === 'out_of_stock'
                ? 'out_of_stock'
                : 'in_stock') as 'in_stock' | 'out_of_stock',
            },
            imageUrls: [],
          }}
          addedQuantity={quantity}
        />
      )}
    </div>
  );
};

export default ProductDetailPage;
