// UserApiAdapter - User Service API 연동
// Clean Architecture: API Adapters Layer
// 위치: client/src/adapters/api/UserApiAdapter.ts

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

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
  details?: any[];
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
  emailError: string | null;
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class UserApiAdapter {
  private baseURL: string;

  constructor() {
    this.baseURL =
      process.env.REACT_APP_USER_SERVICE_URL ||
      'http://localhost:3002/api/users';
  }

  // ========================================
  // Authentication Methods
  // ========================================

  async login(
    credentials: LoginCredentials
  ): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await fetch(`${this.baseURL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: ApiResponse<LoginResponse> = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '로그인에 실패했습니다.');
      }

      return data;
    } catch (error) {
      console.error('Login API Error:', error);
      throw error;
    }
  }

  async register(
    userData: RegisterData
  ): Promise<ApiResponse<RegisterResponse>> {
    try {
      const response = await fetch(`${this.baseURL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data: ApiResponse<RegisterResponse> = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '회원가입에 실패했습니다.');
      }

      return data;
    } catch (error) {
      console.error('Register API Error:', error);
      throw error;
    }
  }

  async refreshToken(
    refreshToken: string
  ): Promise<ApiResponse<RefreshTokenResponse>> {
    try {
      const response = await fetch(`${this.baseURL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data: ApiResponse<RefreshTokenResponse> = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '토큰 갱신에 실패했습니다.');
      }

      return data;
    } catch (error) {
      console.error('Refresh Token API Error:', error);
      throw error;
    }
  }

  // ========================================
  // Protected User Methods (require auth token)
  // ========================================

  async getProfile(accessToken: string): Promise<ApiResponse<{ user: User }>> {
    try {
      const response = await fetch(`${this.baseURL}/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data: ApiResponse<{ user: User }> = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '프로필 조회에 실패했습니다.');
      }

      return data;
    } catch (error) {
      console.error('Get Profile API Error:', error);
      throw error;
    }
  }

  async updateProfile(
    accessToken: string,
    profileData: UpdateProfileData
  ): Promise<ApiResponse<{ user: User }>> {
    try {
      const response = await fetch(`${this.baseURL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(profileData),
      });

      const data: ApiResponse<{ user: User }> = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '프로필 업데이트에 실패했습니다.');
      }

      return data;
    } catch (error) {
      console.error('Update Profile API Error:', error);
      throw error;
    }
  }

  async deactivateAccount(accessToken: string): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseURL}/profile`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data: ApiResponse<any> = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '계정 비활성화에 실패했습니다.');
      }

      return data;
    } catch (error) {
      console.error('Deactivate Account API Error:', error);
      throw error;
    }
  }

  // ========================================
  // Health Check
  // ========================================

  async healthCheck(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
      });

      return await response.json();
    } catch (error) {
      console.error('Health Check API Error:', error);
      throw error;
    }
  }
}
