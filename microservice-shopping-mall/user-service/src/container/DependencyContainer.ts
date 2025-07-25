// ========================================
// Dependency Injection Container - Clean Architecture 완성
// src/container/DependencyContainer.ts
// ========================================

import { DataSource } from 'typeorm';

// ===== Entities (Domain Layer) =====
// User Entity는 이미 구현되어 있음

// ===== Use Cases (Application Layer) =====
import { RegisterUserUseCase } from '../usecases/RegisterUserUseCase';
import { LoginUserUseCase } from '../usecases/LoginUserUseCase';
import { GetUserProfileUseCase } from '../usecases/GetUserProfileUseCase';
import { UpdateUserProfileUseCase } from '../usecases/UpdateUserProfileUseCase';
import { DeactivateUserUseCase } from '../usecases/DeactivateUserUseCase';

// ===== Adapters (Infrastructure Layer) =====
import { PostgreSQLUserRepository } from '../adapters/PostgreSQLUserRepository';

// ===== Framework (Presentation Layer) =====
import { UserController } from '../frameworks/controllers/UserController';
import { JwtTokenService } from '../frameworks/services/JwtTokenService';
import { MockEmailService } from '../frameworks/services/MockEmailService';

// ===== Types =====
import { UserRepository, EmailService, TokenService } from '../usecases/types';

/**
 * DependencyContainer - 의존성 주입 컨테이너
 *
 * 역할:
 * - Clean Architecture의 모든 계층을 연결
 * - 의존성 역전 원칙(DIP) 구현
 * - 단일 책임 원칙(SRP) 준수
 * - 싱글톤 패턴 적용
 *
 * Clean Architecture 의존성 방향:
 * Framework → Use Case → Entity
 * Adapter → Use Case → Entity
 *
 * 특징:
 * - 타입 안전성 보장
 * - 테스트 가능한 구조
 * - 환경별 다른 구현체 주입 가능
 */
export class DependencyContainer {
  // ===== Infrastructure (Adapter Layer) =====
  private _dataSource: DataSource;
  private _userRepository!: UserRepository; // TypeScript strict 모드 대응
  private _emailService!: EmailService;
  private _tokenService!: TokenService;

  // ===== Application (Use Case Layer) =====
  private _registerUserUseCase!: RegisterUserUseCase;
  private _loginUserUseCase!: LoginUserUseCase;
  private _getUserProfileUseCase!: GetUserProfileUseCase;
  private _updateUserProfileUseCase!: UpdateUserProfileUseCase;
  private _deactivateUserUseCase!: DeactivateUserUseCase;

  // ===== Presentation (Framework Layer) =====
  private _userController!: UserController;

  constructor(dataSource: DataSource) {
    this._dataSource = dataSource;

    // 의존성 주입 체인 실행
    this.initializeInfrastructure();
    this.initializeUseCases();
    this.initializeControllers();
  }

  // ========================================
  // Infrastructure Layer 초기화 (Adapter)
  // ========================================
  private initializeInfrastructure(): void {
    // Repository 초기화 (Database Adapter)
    this._userRepository = new PostgreSQLUserRepository(this._dataSource);

    // External Services 초기화
    this._emailService = new MockEmailService();
    this._tokenService = new JwtTokenService();

    console.log('✅ Infrastructure Layer 초기화 완료');
  }

  // ========================================
  // Application Layer 초기화 (Use Cases)
  // ========================================
  private initializeUseCases(): void {
    // 사용자 등록 Use Case
    this._registerUserUseCase = new RegisterUserUseCase(
      this._userRepository,
      this._emailService
    );

    // 사용자 로그인 Use Case
    this._loginUserUseCase = new LoginUserUseCase(
      this._userRepository,
      this._tokenService
    );

    // 사용자 프로필 조회 Use Case
    this._getUserProfileUseCase = new GetUserProfileUseCase(
      this._userRepository
    );

    // 사용자 프로필 업데이트 Use Case
    this._updateUserProfileUseCase = new UpdateUserProfileUseCase(
      this._userRepository
    );

    // 사용자 계정 비활성화 Use Case
    this._deactivateUserUseCase = new DeactivateUserUseCase(
      this._userRepository
    );

    console.log('✅ Application Layer 초기화 완료');
  }

  // ========================================
  // Presentation Layer 초기화 (Controllers)
  // ========================================
  private initializeControllers(): void {
    // User Controller 초기화 (모든 Use Case 주입)
    this._userController = new UserController(
      this._registerUserUseCase,
      this._loginUserUseCase,
      this._getUserProfileUseCase,
      this._updateUserProfileUseCase,
      this._deactivateUserUseCase
    );

    console.log('✅ Presentation Layer 초기화 완료');
    console.log('🎉 Clean Architecture 의존성 주입 완료!');
  }

  // ========================================
  // Public Getters (외부에서 접근)
  // ========================================

  // Controllers (Framework Layer)
  get userController(): UserController {
    return this._userController;
  }

  // Services (Framework Layer)
  get tokenService(): TokenService {
    return this._tokenService;
  }

  get emailService(): EmailService {
    return this._emailService;
  }

  // Repositories (Adapter Layer)
  get userRepository(): UserRepository {
    return this._userRepository;
  }

  // Use Cases (Application Layer) - 테스트용
  get registerUserUseCase(): RegisterUserUseCase {
    return this._registerUserUseCase;
  }

  get loginUserUseCase(): LoginUserUseCase {
    return this._loginUserUseCase;
  }

  get getUserProfileUseCase(): GetUserProfileUseCase {
    return this._getUserProfileUseCase;
  }

  get updateUserProfileUseCase(): UpdateUserProfileUseCase {
    return this._updateUserProfileUseCase;
  }

  get deactivateUserUseCase(): DeactivateUserUseCase {
    return this._deactivateUserUseCase;
  }

  // ========================================
  // Container 관리 메서드
  // ========================================

  /**
   * 컨테이너 상태 확인
   */
  getStatus(): {
    initialized: boolean;
    layers: {
      infrastructure: boolean;
      application: boolean;
      presentation: boolean;
    };
    services: string[];
  } {
    return {
      initialized: true,
      layers: {
        infrastructure: !!(
          this._userRepository &&
          this._emailService &&
          this._tokenService
        ),
        application: !!(this._registerUserUseCase && this._loginUserUseCase),
        presentation: !!this._userController,
      },
      services: [
        'PostgreSQLUserRepository',
        'MockEmailService',
        'JwtTokenService',
        'RegisterUserUseCase',
        'LoginUserUseCase',
        'GetUserProfileUseCase',
        'UpdateUserProfileUseCase',
        'DeactivateUserUseCase',
        'UserController',
      ],
    };
  }

  /**
   * 리소스 정리 (서버 종료 시)
   */
  async cleanup(): Promise<void> {
    console.log('🧹 DependencyContainer 정리 시작...');

    try {
      // 데이터베이스 연결 종료
      if (this._dataSource && this._dataSource.isInitialized) {
        await this._dataSource.destroy();
        console.log('✅ Database connection 정리 완료');
      }

      console.log('✅ DependencyContainer 정리 완료');
    } catch (error) {
      console.error('❌ DependencyContainer 정리 중 오류:', error);
    }
  }
}

// ========================================
// Container Factory 함수
// ========================================

/**
 * 의존성 컨테이너 생성 팩토리 함수
 *
 * 환경별로 다른 구현체를 주입할 수 있도록 설계
 */
export async function createDependencyContainer(
  dataSource: DataSource,
  options: {
    environment?: 'development' | 'test' | 'production';
    enableLogging?: boolean;
  } = {}
): Promise<DependencyContainer> {
  const { environment = 'development', enableLogging = true } = options;

  if (enableLogging) {
    console.log(`🚀 DependencyContainer 초기화 시작 (${environment})`);
  }

  // 데이터베이스 연결 확인
  if (!dataSource.isInitialized) {
    throw new Error('DataSource가 초기화되지 않았습니다');
  }

  // 컨테이너 생성
  const container = new DependencyContainer(dataSource);

  if (enableLogging) {
    console.log('✅ DependencyContainer 초기화 완료');
    console.log('📊 Container 상태:', container.getStatus());
  }

  return container;
}

// ========================================
// Clean Architecture 완성!
// ========================================

/**
 * Clean Architecture 의존성 흐름:
 *
 * 1. Entity (Domain)
 *    └── User Entity (비즈니스 로직)
 *
 * 2. Use Cases (Application)
 *    └── RegisterUserUseCase
 *    └── LoginUserUseCase
 *    └── GetUserProfileUseCase
 *    └── UpdateUserProfileUseCase
 *    └── DeactivateUserUseCase
 *    ↑ Repository Interface 의존
 *
 * 3. Adapters (Infrastructure)
 *    └── PostgreSQLUserRepository (Repository 구현)
 *    └── MockEmailService
 *    └── JwtTokenService
 *    ↑ Use Cases에 주입됨
 *
 * 4. Framework (Presentation)
 *    └── UserController
 *    └── Routes, Middlewares
 *    ↑ Use Cases에 의존
 *
 * 핵심 원칙:
 * - 의존성 역전 원칙 (DIP): 상위 레벨이 하위 레벨에 의존하지 않음
 * - 단일 책임 원칙 (SRP): 각 클래스는 하나의 책임만
 * - 개방-폐쇄 원칙 (OCP): 확장에는 열려있고 수정에는 닫혀있음
 * - 인터페이스 분리 원칙 (ISP): 불필요한 의존성 제거
 * - 리스코프 치환 원칙 (LSP): 인터페이스 구현체 교체 가능
 */
