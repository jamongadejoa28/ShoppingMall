import axios, { AxiosResponse } from 'axios';
import { API_BASE_URL } from '../constants/api';
import { ApiResponse } from '../types';

// Axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 인증 토큰 자동 추가
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('accessToken');

    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => Promise.reject(error)
);

// 응답 인터셉터 - 에러 처리 및 토큰 갱신
apiClient.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (
          refreshToken &&
          refreshToken !== 'undefined' &&
          refreshToken !== 'null'
        ) {
          const response = await axios.post(
            `${API_BASE_URL.replace('/api/v1', '')}/api/v1/auth/refresh`,
            {
              refreshToken,
            }
          );

          const { accessToken, refreshToken: newRefreshToken } =
            response.data.data;

          // localStorage 업데이트
          localStorage.setItem('accessToken', accessToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }

          // 원래 요청 재시도
          return apiClient(originalRequest);
        } else {
          throw new Error('No refresh token available');
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // 모든 인증 데이터 삭제
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');

        // 현재 경로를 포함한 로그인 페이지로 리다이렉트
        const currentPath = window.location.pathname;
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }

    return Promise.reject(error);
  }
);
