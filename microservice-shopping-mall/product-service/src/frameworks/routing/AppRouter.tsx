import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// 상수 직접 정의
const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  PRODUCTS: '/products',
  PRODUCT_DETAIL: '/products/:id',
  CART: '/cart',
  CHECKOUT: '/checkout',
  ORDERS: '/orders',
  PROFILE: '/profile',
} as const;

// Header 컴포넌트 직접 정의
const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to={ROUTES.HOME} className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-600">ShoppingMall</h1>
          </Link>

          <nav className="hidden md:flex space-x-8">
            <Link
              to={ROUTES.PRODUCTS}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              상품
            </Link>
          </nav>

          <div className="flex items-center space-x-4">
            <Link
              to={ROUTES.CART}
              className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              🛒
            </Link>
            <Link
              to={ROUTES.LOGIN}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              로그인
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

// ProductsPage 직접 정의
const ProductsPage = React.lazy(() => import('../ui/pages/ProductsPage'));

// 임시 페이지 컴포넌트
const TempPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600">
        백엔드 API 연동 후 실제 기능이 구현됩니다.
      </p>
    </div>
  </div>
);

// 다른 페이지들도 에러 방지를 위해 fallback 추가
const SafePage: React.FC<{ title: string }> = ({ title }) => {
  return <TempPage title={title} />;
};

const ProductDetailPage = React.lazy(() =>
  import('../ui/pages/ProductDetailPage').catch(() => ({
    default: () => <SafePage title="상품 상세" />,
  }))
);

const CartPage = React.lazy(() =>
  import('../ui/pages/CartPage').catch(() => ({
    default: () => <SafePage title="장바구니" />,
  }))
);

const CheckoutPage = React.lazy(() =>
  import('../ui/pages/CheckoutPage').catch(() => ({
    default: () => <SafePage title="주문하기" />,
  }))
);

const OrdersPage = React.lazy(() =>
  import('../ui/pages/OrdersPage').catch(() => ({
    default: () => <SafePage title="주문내역" />,
  }))
);

const ProfilePage = React.lazy(() =>
  import('../ui/pages/ProfilePage').catch(() => ({
    default: () => <SafePage title="프로필" />,
  }))
);

export const AppRouter: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <React.Suspense
            fallback={
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            }
          >
            <Routes>
              <Route
                path={ROUTES.HOME}
                element={<TempPage title="홈페이지" />}
              />
              <Route
                path={ROUTES.LOGIN}
                element={<TempPage title="로그인" />}
              />
              <Route
                path={ROUTES.REGISTER}
                element={<TempPage title="회원가입" />}
              />
              <Route path={ROUTES.PRODUCTS} element={<ProductsPage />} />
              <Route
                path={ROUTES.PRODUCT_DETAIL}
                element={<ProductDetailPage />}
              />
              <Route path={ROUTES.CART} element={<CartPage />} />
              <Route path={ROUTES.CHECKOUT} element={<CheckoutPage />} />
              <Route path={ROUTES.ORDERS} element={<OrdersPage />} />
              <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
              <Route
                path="*"
                element={<TempPage title="페이지를 찾을 수 없습니다" />}
              />
            </Routes>
          </React.Suspense>
        </main>
      </div>
    </Router>
  );
};
