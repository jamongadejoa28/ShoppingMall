import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// User Entity의 생성자 매개변수 타입
export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role?: 'customer' | 'admin';
  phone?: string;
}

// 프로필 업데이트용 타입
export interface UpdateProfileData {
  name?: string;
  phone?: string;
  address?: string;
}

// User Entity - Clean Architecture의 Entity 계층
export class User {
  public id?: string;
  public name: string;
  public email: string;
  public password: string;
  public role: 'customer' | 'admin';
  public phone?: string;
  public address?: string;
  public isEmailVerified: boolean;
  public emailVerifiedAt?: Date;
  public isActive: boolean;
  public deactivatedAt: Date | null;
  public lastLoginAt?: Date;
  public refreshToken?: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: CreateUserData) {
    // 입력 데이터 유효성 검증
    this.validateInput(data);

    // 기본 속성 설정
    this.name = data.name.trim();
    this.email = data.email.toLowerCase().trim();
    this.password = this.hashPassword(data.password);
    this.role = data.role || 'customer';
    
    // optional 속성들 - 조건부 할당
    if (data.phone) {
      this.phone = data.phone;
    }
    
    // 기본 상태 설정
    this.isEmailVerified = false;
    this.isActive = true;
    this.deactivatedAt = null;
    
    // 타임스탬프 설정
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }

  // 입력 데이터 유효성 검증
  private validateInput(data: CreateUserData): void {
    // 이름 검증
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('이름은 필수 항목입니다');
    }

    // 이메일 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      throw new Error('유효하지 않은 이메일 형식입니다');
    }

    // 비밀번호 강도 검증 (해시화 전에 검증)
    this.validatePasswordStrength(data.password);
  }

  // 비밀번호 강도 검증
  private validatePasswordStrength(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (
      password.length < minLength ||
      !hasUpperCase ||
      !hasLowerCase ||
      !hasNumbers ||
      !hasSpecialChar
    ) {
      throw new Error('비밀번호는 8자 이상이며 대소문자, 숫자, 특수문자를 포함해야 합니다');
    }
  }

  // 비밀번호 해시화
  private hashPassword(password: string): string {
    this.validatePasswordStrength(password);
    const saltRounds = 12;
    return bcrypt.hashSync(password, saltRounds);
  }

  // 비밀번호 검증 (로그인 시 사용)
  public async validatePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password);
  }

  // 이메일 인증 완료
  public verifyEmail(): void {
    this.isEmailVerified = true;
    this.emailVerifiedAt = new Date();
    this.updatedAt = new Date();
  }

  // 사용자 비활성화
  public deactivate(): void {
    this.isActive = false;
    this.deactivatedAt = new Date();
    this.updatedAt = new Date();
  }

  // 사용자 활성화
  public activate(): void {
    this.isActive = true;
    this.deactivatedAt = null;
    this.updatedAt = new Date();
  }

  // 마지막 로그인 시간 업데이트
  public updateLastLogin(): void {
    this.lastLoginAt = new Date();
    this.updatedAt = new Date();
  }

  // 프로필 정보 업데이트
  public updateProfile(updateData: UpdateProfileData): void {
    if (updateData.name) {
      if (updateData.name.trim().length === 0) {
        throw new Error('이름은 빈 값일 수 없습니다');
      }
      this.name = updateData.name.trim();
    }

    if (updateData.phone) {
      this.phone = updateData.phone.trim();
    }

    if (updateData.address) {
      this.address = updateData.address.trim();
    }

    this.updatedAt = new Date();
  }

  // 리프레시 토큰 생성
  public generateRefreshToken(): string {
    this.refreshToken = uuidv4();
    this.updatedAt = new Date();
    return this.refreshToken;
  }

  // 리프레시 토큰 무효화
  public invalidateRefreshToken(): void {
    delete this.refreshToken;
    this.updatedAt = new Date();
  }

  // 사용자가 활성 상태인지 확인
  public isActiveUser(): boolean {
    return this.isActive && this.isEmailVerified;
  }

  // 관리자 권한인지 확인
  public isAdmin(): boolean {
    return this.role === 'admin';
  }

  // Entity를 JSON으로 직렬화 (비밀번호 제외)
  public toJSON(): Record<string, any> {
    const { password, refreshToken, ...userWithoutSensitiveData } = this;
    return userWithoutSensitiveData;
  }
}