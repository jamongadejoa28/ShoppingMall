// ========================================
// src/usecases/types/index.ts - 업데이트된 전체 파일
// ========================================

import { User } from '../../entities/User';

// ===== Result 패턴 - 성공/실패를 명확히 구분 =====
export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ===== 사용자 등록 관련 타입 =====
export interface RegisterUserRequest {
  name: string;
  email: string;
  password: string;
  role?: 'customer' | 'admin';
}

export interface RegisterUserResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'admin';
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt: Date;
  };
  emailSent: boolean;
  emailError?: string | undefined; // undefined 명시적 허용
}

// ===== 로그인 관련 타입 =====
export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface LoginUserResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'admin';
    isEmailVerified: boolean;
    lastLoginAt: Date;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

// ===== 사용자 프로필 조회 관련 타입 =====
export interface GetUserProfileRequest {
  userId: string;
}

export interface GetUserProfileResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'admin';
    phone?: string;
    address?: string;
    isEmailVerified: boolean;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  };
}

// ===== 사용자 프로필 업데이트 관련 타입 =====
export interface UpdateUserProfileRequest {
  userId: string;
  name?: string;
  phone?: string;
  address?: string;
}

export interface UpdateUserProfileResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'admin';
    phone?: string;
    address?: string;
    isEmailVerified: boolean;
    isActive: boolean;
    updatedAt: Date;
  };
}

// ===== 회원 탈퇴 관련 타입 =====
export interface DeactivateUserRequest {
  userId: string;
}

export interface DeactivateUserResponse {
  message: string;
  deactivatedAt: Date;
  user: {
    id: string;
    email: string;
    isActive: boolean;
  };
}

// ===== Repository 인터페이스 (Dependency Inversion) =====
export interface UserRepository {
  save(user: User): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  update(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}

// ===== 외부 서비스 인터페이스 =====
export interface EmailService {
  sendVerificationEmail(email: string, token: string): Promise<boolean>;
  sendPasswordResetEmail(email: string, token: string): Promise<boolean>;
  sendWelcomeEmail(email: string, name: string): Promise<boolean>;
}

// ===== JWT 토큰 서비스 인터페이스 =====
export interface TokenService {
  generateAccessToken(payload: {
    id: string;
    email: string;
    role: 'customer' | 'admin';
  }): string;

  generateRefreshToken(payload: { id: string; email: string }): string;

  verifyAccessToken(token: string): {
    id: string;
    email: string;
    role: 'customer' | 'admin';
  } | null;

  verifyRefreshToken(token: string): {
    id: string;
    email: string;
  } | null;

  getTokenExpirationTime(): number; // seconds
}

// ===== Use Case 공통 인터페이스 =====
export interface UseCase<TRequest, TResponse> {
  execute(request: TRequest): Promise<Result<TResponse>>;
}

// ===== 에러 타입 정의 =====
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class ExternalServiceError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}
