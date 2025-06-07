import { create } from 'zustand';
import { User } from '@entities/user/User';
import { LoginUseCase } from '@usecases/auth/LoginUseCase';
import { RegisterUseCase } from '@usecases/auth/RegisterUseCase';
import { LogoutUseCase } from '@usecases/auth/LogoutUseCase';
import { UserApiAdapter } from '@adapters/api/UserApiAdapter';



interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

const userApiAdapter = new UserApiAdapter();
const loginUseCase = new LoginUseCase(userApiAdapter);
const registerUseCase = new RegisterUseCase(userApiAdapter);
const logoutUseCase = new LogoutUseCase(userApiAdapter);

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await loginUseCase.execute({ email, password });
      set({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        error: error.message,
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
      throw error;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await registerUseCase.execute({ name, email, password });
      set({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        error: error.message,
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });

    try {
      await logoutUseCase.execute();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        error: error.message,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),

  setUser: (user: User | null) =>
    set({
      user,
      isAuthenticated: !!user,
    }),
}));
