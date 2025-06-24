// DI Container 디버깅 스크립트
require('reflect-metadata');

console.log('=== DI Container 디버깅 시작 ===');

// 환경변수 설정
process.env.NODE_ENV = "test";
process.env.TEST_MODE = "true";
process.env.DATABASE_HOST = "localhost";
process.env.DATABASE_PORT = "5433";
process.env.DATABASE_NAME = "cart_service_test";
process.env.DATABASE_USER = "test_user";
process.env.DATABASE_PASSWORD = "test_password";
process.env.REDIS_HOST = "localhost";
process.env.REDIS_PORT = "6380";

async function debugDI() {
  try {
    console.log('1. ts-node 설정...');
    require('ts-node').register({
      transpileOnly: true,
      files: true
    });
    console.log('✅ ts-node 설정 완료');

    console.log('2. Global setup 실행...');
    const globalSetup = require('./src/__tests__/setup/global-setup');
    await globalSetup.default();
    console.log('✅ Global setup 완료');

    console.log('3. DI Container import 시도...');
    const { DIContainer } = require('./src/infrastructure/di/Container');
    console.log('✅ DI Container import 성공');

    console.log('4. Container 생성 시도...');
    const container = await DIContainer.create();
    console.log('✅ Container 생성 성공');

    console.log('5. TYPES import 시도...');
    const { TYPES } = require('./src/infrastructure/di/types');
    console.log('✅ TYPES import 성공');

    console.log('6. CartController 가져오기 시도...');
    const cartController = container.get(TYPES.CartController);
    console.log('✅ CartController 가져오기 성공:', typeof cartController);

    console.log('7. CartController 메서드 확인...');
    console.log('addToCart:', typeof cartController.addToCart);
    console.log('getCart:', typeof cartController.getCart);

    console.log('8. 정리...');
    await DIContainer.cleanup();
    console.log('✅ 정리 완료');

  } catch (error) {
    console.error('❌ 디버깅 실패:', error);
    console.error('Stack:', error.stack);
  }
}

debugDI();