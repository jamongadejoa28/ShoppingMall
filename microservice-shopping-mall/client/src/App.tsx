import React, { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AppRouter } from '@frameworks/routing/AppRouter';
import { useAuthStore } from '@frameworks/state/authStore';
import { useCartStore } from '@frameworks/state/cartStore';
import { UserApiAdapter } from '@adapters/api/UserApiAdapter';

const userApiAdapter = new UserApiAdapter();

function App() {
  const { setUser } = useAuthStore();
  const { loadCart } = useCartStore();

  useEffect(() => {
    // 앱 시작 시 토큰이 있으면 사용자 정보 로드
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const user = await userApiAdapter.getCurrentUser();
          setUser(user);
        } catch (error) {
          console.error('사용자 정보 로드 실패:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
      }
    };

    // 장바구니 데이터 로드
    loadCart();

    initializeAuth();
  }, [setUser, loadCart]);

  return (
    <div className="App">
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}

export default App;
