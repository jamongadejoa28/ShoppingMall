import { IUserRepository } from '@entities/user/IUserRepository';
import { User } from '@entities/user/User';
import { LoginCredentials, RegisterData, AuthTokens } from '@shared/types/user';
import { apiClient } from '@shared/utils/api';
import { API_ENDPOINTS } from '@shared/constants/api';

export class UserApiAdapter implements IUserRepository {
  async login(
    credentials: LoginCredentials
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await apiClient.post(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );

    return {
      user: User.fromApiResponse(response.data.data.user),
      tokens: response.data.data.tokens,
    };
  }

  async register(
    data: RegisterData
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);

    return {
      user: User.fromApiResponse(response.data.data.user),
      tokens: response.data.data.tokens,
    };
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get(API_ENDPOINTS.USERS.PROFILE);
    return User.fromApiResponse(response.data.data);
  }

  async updateProfile(id: string, data: Partial<User>): Promise<User> {
    const response = await apiClient.put(
      API_ENDPOINTS.USERS.UPDATE_PROFILE,
      data
    );
    return User.fromApiResponse(response.data.data);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH, {
      refreshToken,
    });
    return response.data.data;
  }

  async logout(): Promise<void> {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  }
}
