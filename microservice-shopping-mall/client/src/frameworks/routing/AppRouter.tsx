import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from '@frameworks/ui/components/Layout/Header';
import { ROUTES } from '@shared/constants/routes';

// 페이지 컴포넌트들 (나중에 구현)
const HomePage = React.lazy(() => import('@frameworks/ui/pages/HomePage'));
const LoginPage = React.lazy(() => import('@frameworks/ui/pages/LoginPage'));
const RegisterPage = React.lazy(
  () => import('@frameworks/ui/pages/RegisterPage')
);
const ProductsPage = React.lazy(
  () => import('@frameworks/ui/pages/ProductsPage')
);
const ProductDetailPage = React.lazy(
  () => import('@frameworks/ui/pages/ProductDetailPage')
);
const CartPage = React.lazy(() => import('@frameworks/ui/pages/CartPage'));
const CheckoutPage = React.lazy(
  () => import('@frameworks/ui/pages/CheckoutPage')
);
const OrdersPage = React.lazy(() => import('@frameworks/ui/pages/OrdersPage'));
const ProfilePage = React.lazy(
  () => import('@frameworks/ui/pages/ProfilePage')
);

const TempPage: React.FC<{title: string}> = ({title}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className='text-4xl font-bold text-gray-900 mb-4'>{title}</h1>
      <p className='text-gray-600'>백엔드 API 연동 후 실제 기능이 구현 됩니다.</p>
    </div>
  </div>
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            }
          >
            <Routes>
              <Route path={ROUTES.HOME} element={<TempPage title="홈페이지" />} />
              <Route path={ROUTES.LOGIN} element={<TempPage title="로그인"/>} />
              <Route path={ROUTES.REGISTER} element={<TempPage title="회원가입" />} />
              <Route path={ROUTES.PRODUCTS} element={<TempPage title="상품 목록" />} />
              <Route
                path={ROUTES.PRODUCT_DETAIL}
                element={<ProductDetailPage />}
              />
              <Route path={ROUTES.CART} element={<TempPage title="장바구니" />} />
              <Route path={ROUTES.CHECKOUT} element={<CheckoutPage />} />
              <Route path={ROUTES.ORDERS} element={<OrdersPage />} />
              <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
              <Route path="*" element={<TempPage title="페이지를 찾을 수 없습니다"/>} />
            </Routes>
          </React.Suspense>
        </main>
      </div>
    </Router>
  );
};
