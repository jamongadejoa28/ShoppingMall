import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@shared/constants/routes';

const CartPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">장바구니</h1>

      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4m2.6 8L6 5H3m4 8v2a2 2 0 002 2h8a2 2 0 002-2v-2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            장바구니가 비어있습니다
          </h3>
          <p className="text-gray-600 mb-6">
            상품을 둘러보고 장바구니에 추가해보세요.
          </p>
          <Link to={ROUTES.PRODUCTS} className="btn-primary">
            상품 둘러보기
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
