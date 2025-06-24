const request = require('supertest');
const path = require('path');

// Mock 환경 설정
process.env.NODE_ENV = "test";
process.env.USE_MOCK_DB = "true";
process.env.USE_MOCK_REDIS = "true";

async function debugTest() {
  try {
    console.log('=== Debug Test 시작 ===');
    
    // Mock Global Setup 실행
    const globalSetup = require('./src/__tests__/setup/mock-global-setup.ts');
    await globalSetup.default();
    console.log('✅ Mock Global Setup 완료');
    
    // DI Container 생성
    const { DIContainer } = require('./src/infrastructure/di/Container.ts');
    const container = await DIContainer.create();
    console.log('✅ DI Container 생성 완료');
    
    // Test App 생성
    const { createTestApp } = require('./src/__tests__/utils/TestAppBuilder.ts');
    const app = await createTestApp(container);
    console.log('✅ Test App 생성 완료');
    
    // Health Check 먼저 테스트
    const healthResponse = await request(app).get('/health');
    console.log('Health Check:', healthResponse.status, healthResponse.body);
    
    // 장바구니 추가 테스트
    const addResponse = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', 'Bearer test-user-123')
      .send({
        productId: 'test-product-123',
        quantity: 1
      });
    
    console.log('=== 장바구니 추가 결과 ===');
    console.log('Status:', addResponse.status);
    console.log('Body:', JSON.stringify(addResponse.body, null, 2));
    
    if (addResponse.status !== 201) {
      console.log('Headers:', addResponse.headers);
    }
    
    // Cleanup
    await DIContainer.cleanup();
    console.log('✅ 정리 완료');
    
  } catch (error) {
    console.error('❌ 디버그 테스트 실패:', error);
  }
}

debugTest();