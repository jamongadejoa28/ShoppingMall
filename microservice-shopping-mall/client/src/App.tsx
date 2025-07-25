import React, { useEffect } from 'react';
import { AppRouter } from './frameworks/routing/AppRouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5분
    },
  },
});

function App() {
  useEffect(() => {
    // 개발 환경에서만 앱 시작 로그
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Client App started - Clean Architecture');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <AppRouter />
        <Toaster position="top-right" />
      </div>
    </QueryClientProvider>
  );
}

export default App;
