// ========================================
// CartPage - 간단한 장바구니 페이지 (백엔드 구현 후 개발 예정)
// client/src/frameworks/ui/pages/CartPage.tsx
// ========================================

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';

const CartPage: React.FC = () => {
  const navigate = useNavigate();

  const handleContinueShopping = () => {
    navigate(ROUTES.PRODUCTS);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">장바구니</h1>

      <div className="text-center py-12">
        <svg
          className="mx-auto h-24 w-24 text-gray-400 mb-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4m2.6 8L6 5H3m4 8v2a2 2 0 002 2h8a2 2 0 002-2v-2"
          />
        </svg>

        <h3 className="text-xl font-medium text-gray-900 mb-4">
          장바구니 기능 개발 중
        </h3>

        <p className="text-gray-600 mb-8">
          장바구니 페이지는 백엔드 API 구현 후 개발 예정입니다.
        </p>

        <button
          onClick={handleContinueShopping}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          쇼핑하러 가기
        </button>
      </div>
    </div>
  );
};

export default CartPage;
