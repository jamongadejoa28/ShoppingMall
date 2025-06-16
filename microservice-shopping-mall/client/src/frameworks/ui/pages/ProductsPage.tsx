import React, { useState, useEffect } from 'react';

// 백엔드 응답 구조에 맞는 타입
interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  brand: string;
  category: {
    name: string;
  };
  inventory: {
    availableQuantity: number;
    status: string;
  };
}

// ApiResponse 인터페이스 제거 (현재 사용하지 않음)

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch API 사용 (axios 의존성 제거)
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3003/api/v1/products');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setProducts(data.data.products);
      } else {
        throw new Error(data.message || '상품 목록을 불러오는데 실패했습니다.');
      }
    } catch (err: any) {
      const errorMessage =
        err.message || '상품 목록을 불러오는 중 오류가 발생했습니다.';
      setError(errorMessage);

      // react-hot-toast 의존성 제거 - 간단한 alert 사용
      if (process.env.NODE_ENV === 'development') {
        console.error('ProductsPage - API Error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // 가격 포맷팅
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  // 재고 상태 표시
  const getStockStatus = (status: string) => {
    switch (status) {
      case 'SUFFICIENT':
        return <span className="text-green-600 text-sm">재고 충분</span>;
      case 'LOW_STOCK':
        return <span className="text-yellow-600 text-sm">재고 부족</span>;
      case 'OUT_OF_STOCK':
        return <span className="text-red-600 text-sm">품절</span>;
      default:
        return <span className="text-gray-600 text-sm">재고 확인 중</span>;
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">상품 목록을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="w-6 h-6 text-red-600 mr-3">⚠️</div>
            <div>
              <h3 className="text-lg font-medium text-red-800">
                오류가 발생했습니다
              </h3>
              <p className="text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchProducts}
                className="mt-3 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">상품 목록</h1>
        <p className="text-gray-600">
          총 {products.length}개의 상품이 있습니다.
        </p>
      </div>

      {/* 상품 목록 */}
      {products.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            상품이 없습니다
          </h3>
          <p className="text-gray-500">등록된 상품이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(product => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                {/* 상품 이미지 플레이스홀더 */}
                <div className="w-full h-48 bg-gray-100 rounded-md mb-4 flex items-center justify-center">
                  <div className="text-4xl">🛍️</div>
                </div>

                {/* 상품 정보 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-600 font-medium">
                      {product.brand}
                    </span>
                    {getStockStatus(product.inventory.status)}
                  </div>

                  <h3 className="font-semibold text-gray-900 line-clamp-2">
                    {product.name}
                  </h3>

                  <p className="text-sm text-gray-600 line-clamp-2">
                    {product.description}
                  </p>

                  <div className="space-y-1">
                    {product.discountPrice ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-red-600">
                            {formatPrice(product.discountPrice)}원
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            {formatPrice(product.price)}원
                          </span>
                        </div>
                        <div className="text-sm text-red-600">
                          {Math.round(
                            ((product.price - product.discountPrice) /
                              product.price) *
                              100
                          )}
                          % 할인
                        </div>
                      </>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(product.price)}원
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500">
                    카테고리: {product.category.name} | 재고:{' '}
                    {product.inventory.availableQuantity}개
                  </div>
                </div>

                {/* 액션 버튼들 */}
                <div className="mt-4 space-y-2">
                  <button
                    disabled={product.inventory.status === 'OUT_OF_STOCK'}
                    className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                      product.inventory.status === 'OUT_OF_STOCK'
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {product.inventory.status === 'OUT_OF_STOCK'
                      ? '품절'
                      : '장바구니 담기'}
                  </button>

                  <button className="w-full py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
                    상세보기
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
