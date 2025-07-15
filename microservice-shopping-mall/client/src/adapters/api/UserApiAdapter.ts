// UserApiAdapter - User Service API 연동
// Clean Architecture: API Adapters Layer

import { apiClient } from '../../shared/utils/api';
import { API_ENDPOINTS } from '../../shared/constants/api';
import { User, LoginCredentials, RegisterData } from '../../shared/types/user';

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface RegisterResponse {
  user: User;
  emailSent: boolean;
}

export class UserApiAdapter {
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<LoginResponse>>(
        API_ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '로그인에 실패했습니다.'
      );
    }
  }

  async register(
    userData: RegisterData
  ): Promise<ApiResponse<RegisterResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<RegisterResponse>>(
        API_ENDPOINTS.AUTH.REGISTER,
        userData
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '회원가입에 실패했습니다.'
      );
    }
  }

  async getProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await apiClient.get<ApiResponse<User>>(
        API_ENDPOINTS.AUTH.PROFILE
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          '사용자 정보 조회에 실패했습니다.'
      );
    }
  }
}
