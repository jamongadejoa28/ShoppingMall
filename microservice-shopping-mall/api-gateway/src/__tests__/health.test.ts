// api-gateway/src/__tests__/health.test.ts

import { createLogger } from '@shopping-mall/shared';

describe('Health Check Tests', () => {
  it('should create logger instance', () => {
    const logger = createLogger('test');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should verify environment is test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have JWT secrets configured in test', () => {
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret');
    expect(process.env.JWT_REFRESH_SECRET).toBe('test-refresh-secret');
  });
});
