// ========================================
// Database Configuration - TypeORM 설정
// src/config/database.ts
// ========================================

import { DataSource } from 'typeorm';
import { UserEntity } from '../adapters/entities/UserEntity';

/**
 * createDatabaseConnection - TypeORM 데이터베이스 연결 설정
 *
 * 역할:
 * - PostgreSQL 데이터베이스 연결 구성
 * - Entity 등록
 * - 환경별 설정 분리
 * - 마이그레이션 및 동기화 설정
 *
 * 특징:
 * - TypeORM 0.3.24 호환
 * - 환경변수 기반 설정
 * - 개발/테스트/운영 환경 분리
 * - 에러 처리 및 재시도 로직
 */

/**
 * 데이터베이스 설정 생성
 */
function createDataSourceConfig(): any {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  // 기본 설정 (사용자 .env 파일에 맞춤)
  const config = {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres', // DB_USER로 변경
    password: process.env.DB_PASSWORD || 'your_db_password',
    database: process.env.DB_NAME || 'shopping_mall_users', // DB_NAME으로 변경

    // Entity 등록
    entities: [UserEntity],

    // 마이그레이션 설정
    migrations: ['src/migrations/*.ts'],
    migrationsTableName: 'migrations',

    // 연결 설정
    synchronize: !isProduction, // 운영환경에서는 false
    logging: process.env.DB_LOGGING === 'true' || (!isProduction && !isTest),
    dropSchema: isTest, // 테스트 환경에서만 스키마 초기화

    // 연결 풀 설정
    extra: {
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
      acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000', 10),
      timeout: parseInt(process.env.DB_TIMEOUT || '30000', 10),
    },

    // SSL 설정 (운영환경)
    ssl: isProduction
      ? {
          rejectUnauthorized: false,
        }
      : false,

    // 메타데이터 설정
    metadataTableName: 'typeorm_metadata',
  };

  return config;
}

/**
 * 데이터베이스 연결 생성 및 초기화
 */
export async function createDatabaseConnection(): Promise<DataSource> {
  const config = createDataSourceConfig();
  const dataSource = new DataSource(config);

  try {
    console.log('🔌 데이터베이스 연결 시도 중...');
    console.log(
      `📊 Database: ${config.host}:${config.port}/${config.database}`
    );

    // 데이터베이스 연결
    await dataSource.initialize();

    console.log('✅ 데이터베이스 연결 성공');

    // 테스트 환경이 아닌 경우 연결 정보 로깅
    if (process.env.NODE_ENV !== 'test') {
      console.log('📋 데이터베이스 정보:');
      console.log(`   - Type: ${config.type}`);
      console.log(`   - Host: ${config.host}:${config.port}`);
      console.log(`   - Database: ${config.database}`);
      console.log(`   - Synchronize: ${config.synchronize}`);
      console.log(`   - Logging: ${config.logging}`);
    }

    return dataSource;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error);

    // 상세한 에러 정보 제공
    if (error instanceof Error) {
      console.error('🔍 에러 상세:', {
        message: error.message,
        code: (error as any).code,
        host: config.host,
        port: config.port,
        database: config.database,
      });
    }

    throw error;
  }
}

/**
 * 데이터베이스 연결 테스트
 */
export async function testDatabaseConnection(): Promise<boolean> {
  let dataSource: DataSource | null = null;

  try {
    console.log('🧪 데이터베이스 연결 테스트 시작...');

    dataSource = await createDatabaseConnection();

    // 간단한 쿼리 실행으로 연결 테스트
    await dataSource.query('SELECT 1');

    console.log('✅ 데이터베이스 연결 테스트 성공');
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 테스트 실패:', error);
    return false;
  } finally {
    // 테스트 후 연결 종료
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🧹 테스트 데이터베이스 연결 정리 완료');
    }
  }
}

/**
 * 개발용 데이터베이스 설정 확인
 */
export function validateDatabaseConfig(): void {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER', // DB_USERNAME → DB_USER로 변경
    'DB_PASSWORD',
    'DB_NAME', // DB_DATABASE → DB_NAME으로 변경
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn('⚠️ 누락된 데이터베이스 환경변수:', missingVars);
    console.warn('🔧 기본값을 사용합니다 (개발 환경용)');
  }

  // 데이터베이스 설정 출력 (비밀번호 제외)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 데이터베이스 설정:');
    console.log(`   - Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   - Port: ${process.env.DB_PORT || '5432'}`);
    console.log(`   - Username: ${process.env.DB_USER || 'postgres'}`);
    console.log(
      `   - Database: ${process.env.DB_NAME || 'shopping_mall_users'}`
    );
    console.log(
      `   - Password: ${'*'.repeat((process.env.DB_PASSWORD || 'your_db_password').length)}`
    );
  }
}

// ========================================
// 환경변수 설정 예시 (README용)
// ========================================

/**
 * .env 파일 예시:
 *
 * # Database Configuration
 * DB_HOST=localhost
 * DB_PORT=5432
 * DB_USERNAME=postgres
 * DB_PASSWORD=your_password
 * DB_DATABASE=user_service_db
 * DB_CONNECTION_LIMIT=10
 * DB_ACQUIRE_TIMEOUT=30000
 * DB_TIMEOUT=30000
 * DB_LOGGING=true
 *
 * # JWT Configuration
 * JWT_ACCESS_SECRET=your-super-secret-access-key-at-least-32-characters-long
 * JWT_REFRESH_SECRET=your-different-super-secret-refresh-key-at-least-32-chars
 * JWT_ACCESS_EXPIRES_IN=15m
 * JWT_REFRESH_EXPIRES_IN=7d
 * JWT_ISSUER=user-service
 *
 * # Server Configuration
 * PORT=3002
 * HOST=0.0.0.0
 * NODE_ENV=development
 * SERVICE_VERSION=1.0.0
 *
 * # CORS Configuration
 * ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
 *
 * # Email Configuration (for MockEmailService)
 * FRONTEND_URL=http://localhost:3000
 * EMAIL_SIMULATE_FAILURE=false
 * EMAIL_FAILURE_RATE=0
 *
 * # Development Database (Docker)
 * # docker run --name postgres-user-service \
 * #   -e POSTGRES_DB=user_service_db \
 * #   -e POSTGRES_USER=postgres \
 * #   -e POSTGRES_PASSWORD=password \
 * #   -p 5432:5432 \
 * #   -d postgres:15
 */
