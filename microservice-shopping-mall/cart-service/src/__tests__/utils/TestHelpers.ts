// ========================================
// 테스트 헬퍼 유틸리티
// cart-service/src/__tests__/utils/TestHelpers.ts
// ========================================

/**
 * 비동기 함수 실행 시간 측정
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; executionTime: number }> {
  const startTime = Date.now();
  const result = await fn();
  const executionTime = Date.now() - startTime;

  return { result, executionTime };
}

/**
 * 지정된 시간만큼 대기
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 조건이 만족될 때까지 대기 (폴링)
 */
export async function waitUntil(
  condition: () => Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await delay(intervalMs);
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * 랜덤 정수 생성
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 배열에서 랜덤 요소 선택
 */
export function randomChoice<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

/**
 * 에러가 특정 타입인지 확인
 */
export function isErrorOfType(
  error: any,
  expectedType: new (...args: any[]) => Error
): boolean {
  return error instanceof expectedType;
}
