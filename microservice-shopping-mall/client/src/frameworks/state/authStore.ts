// AuthStore - 인증 상태 관리 (User Service API 연동)
// Clean Architecture: State Management Layer
// 위치: client/src/frameworks/state/authStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserApiAdapter } from '../../adapters/api/UserApiAdapter';

// ========================================
// Types & Interfaces
// ========================================

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: 'customer' | 'admin';
}

interface UpdateProfileData {
  name?: string;
  phone?: string;
  address?: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthState {
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
  refreshAuth: () => Promise<void>;
  updateProfile: (profileData: UpdateProfileData) => Promise<AuthResult>;
  deactivateAccount: () => Promise<AuthResult>;

  // Internal methods
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

// ========================================
// AuthStore Implementation
// ========================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      const userApiAdapter = new UserApiAdapter();

      return {
        // ========================================
        // Initial State
        // ========================================
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,

        // ========================================
        // Authentication Actions
        // ========================================

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
            console.error('Login error:', error);
            return {
              success: false,
              error: error.message || '로그인 중 오류가 발생했습니다.',
            };
          }
        },

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
            console.error('Register error:', error);
            return {
              success: false,
              error: error.message || '회원가입 중 오류가 발생했습니다.',
            };
          }
        },

        logout: async (): Promise<void> => {
          try {
            // Clear all auth state
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
            });

            // TODO: Call logout API endpoint when implemented
            console.log('로그아웃 완료');
          } catch (error) {
            console.error('Logout error:', error);
          }
        },

        refreshAuth: async (): Promise<void> => {
          const { refreshToken } = get();

          if (!refreshToken) {
            get().clearAuth();
            return;
          }

          try {
            const response = await userApiAdapter.refreshToken(refreshToken);

            if (response.success && response.data) {
              const {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
              } = response.data;

              set({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
              });
            } else {
              get().clearAuth();
            }
          } catch (error) {
            console.error('Token refresh error:', error);
            get().clearAuth();
          }
        },

        updateProfile: async (
          profileData: UpdateProfileData
        ): Promise<AuthResult> => {
          const { accessToken } = get();

          if (!accessToken) {
            return { success: false, error: '로그인이 필요합니다.' };
          }

          set({ isLoading: true });

          try {
            const response = await userApiAdapter.updateProfile(
              accessToken,
              profileData
            );

            if (response.success && response.data) {
              set({
                user: response.data.user,
                isLoading: false,
              });

              return { success: true };
            } else {
              set({ isLoading: false });
              return {
                success: false,
                error: response.message || '프로필 업데이트에 실패했습니다.',
              };
            }
          } catch (error: any) {
            set({ isLoading: false });
            console.error('Update profile error:', error);
            return {
              success: false,
              error: error.message || '프로필 업데이트 중 오류가 발생했습니다.',
            };
          }
        },

        deactivateAccount: async (): Promise<AuthResult> => {
          const { accessToken } = get();

          if (!accessToken) {
            return { success: false, error: '로그인이 필요합니다.' };
          }

          set({ isLoading: true });

          try {
            const response =
              await userApiAdapter.deactivateAccount(accessToken);

            if (response.success) {
              get().clearAuth();
              return { success: true };
            } else {
              set({ isLoading: false });
              return {
                success: false,
                error: response.message || '계정 비활성화에 실패했습니다.',
              };
            }
          } catch (error: any) {
            set({ isLoading: false });
            console.error('Deactivate account error:', error);
            return {
              success: false,
              error: error.message || '계정 비활성화 중 오류가 발생했습니다.',
            };
          }
        },

        // ========================================
        // Internal Methods
        // ========================================

        setUser: (user: User) => {
          set({ user });
        },

        setTokens: (accessToken: string, refreshToken: string) => {
          set({ accessToken, refreshToken });
        },

        clearAuth: () => {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading });
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

// ========================================
// Export types for use in components
// ========================================

export type {
  User,
  LoginCredentials,
  RegisterData,
  UpdateProfileData,
  AuthResult,
};
