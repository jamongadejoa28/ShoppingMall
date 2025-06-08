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
