// AuthStore - 인증 상태 관리
// Clean Architecture: State Management Layer
// 위치: client/src/frameworks/state/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserApiAdapter } from '../../adapters/api/UserApiAdapter';
import { User, LoginCredentials, RegisterData } from '../../shared/types/user';

// ========================================
// Types & Interfaces - shared/types에서 가져옴
// ========================================

export interface AuthResult {
  success: boolean;
  error?: string;
}

// ========================================
// Auth Store Interface
// ========================================

export interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  register: (userData: RegisterData) => Promise<AuthResult>;
  logout: () => Promise<void>;
  loadUserProfile: () => Promise<AuthResult>;
  clearAuth: () => void;
}

// ========================================
// AuthStore Implementation
// ========================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const userApiAdapter = new UserApiAdapter();

      return {
        // Initial State
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,

        // Login
        login: async (credentials: LoginCredentials): Promise<AuthResult> => {
          set({ isLoading: true });

          try {
            const response = await userApiAdapter.login(credentials);

            if (response.success && response.data) {
              const { user, accessToken, refreshToken } = response.data;

              set({
                user,
                accessToken,
                refreshToken,
                isAuthenticated: true,
                isLoading: false,
              });

              // Store tokens in localStorage for API interceptors
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', refreshToken);

              return { success: true };
            } else {
              set({ isLoading: false });
              return {
                success: false,
                error: response.message || '로그인에 실패했습니다.',
              };
            }
          } catch (error: any) {
            set({ isLoading: false });
            return {
              success: false,
              error: error.message || '로그인 중 오류가 발생했습니다.',
            };
          }
        },

        // Register
        register: async (userData: RegisterData): Promise<AuthResult> => {
          set({ isLoading: true });

          try {
            const response = await userApiAdapter.register(userData);

            if (response.success) {
              set({ isLoading: false });
              return { success: true };
            } else {
              set({ isLoading: false });
              return {
                success: false,
                error: response.message || '회원가입에 실패했습니다.',
              };
            }
          } catch (error: any) {
            set({ isLoading: false });
            return {
              success: false,
              error: error.message || '회원가입 중 오류가 발생했습니다.',
            };
          }
        },

        // Logout
        logout: async (): Promise<void> => {
          try {
            // 서버에 로그아웃 요청 (선택사항)
            // await userApiAdapter.logout();
          } catch (error) {
            console.error('Server logout error:', error);
            // 서버 로그아웃 실패해도 클라이언트 상태는 정리
          } finally {
            get().clearAuth();
          }
        },

        // Load user profile
        loadUserProfile: async (): Promise<AuthResult> => {
          try {
            const response = await userApiAdapter.getProfile();

            if (response.success && response.data) {
              set({ user: response.data });
              return { success: true };
            } else {
              return {
                success: false,
                error: response.message || 'Failed to load user profile',
              };
            }
          } catch (error: any) {
            return {
              success: false,
              error: error.message || '사용자 정보 조회에 실패했습니다.',
            };
          }
        },

        // Clear Auth
        clearAuth: () => {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });

          // Clear localStorage tokens
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        },
      };
    },
    {
      name: 'auth-storage',
      partialize: state => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
