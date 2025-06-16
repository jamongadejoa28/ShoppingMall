import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@frameworks/state/authStore';
import { useCartStore } from '@frameworks/state/cartStore';
import { ROUTES } from '@shared/constants/routes';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { getTotalQuantity } = useCartStore();

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.HOME);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('로그아웃 실패:', error);
      }
    }
  };

  const cartCount = getTotalQuantity();

  return (
    <header className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <Link to={ROUTES.HOME} className="flex items-center">
            <h1 className="text-2xl font-bold text-primary-600">
              ShoppingMall
            </h1>
          </Link>

          {/* 네비게이션 */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to={ROUTES.PRODUCTS}
              className="text-gray-700 hover:text-primary-600 transition-colors"
            >
              상품
            </Link>
          </nav>

          {/* 사용자 메뉴 */}
          <div className="flex items-center space-x-4">
            {/* 장바구니 */}
            <Link
              to={ROUTES.CART}
              className="relative p-2 text-gray-700 hover:text-primary-600 transition-colors"
            >
              <svg
                className="h-6 w-6"
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
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* 사용자 메뉴 */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link
                  to={ROUTES.ORDERS}
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  주문내역
                </Link>
                <Link
                  to={ROUTES.PROFILE}
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  {user?.name || '사용자'}님
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to={ROUTES.LOGIN}
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  로그인
                </Link>
                <Link to={ROUTES.REGISTER} className="btn-primary">
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
