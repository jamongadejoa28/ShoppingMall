import { User } from './User';
import { LoginCredentials, RegisterData, AuthTokens } from '@shared/types/user';

export interface IUserRepository {
  login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }>;
  register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }>;
  getCurrentUser(): Promise<User>;
  updateProfile(id: string, data: Partial<User>): Promise<User>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  logout(): Promise<void>;
}