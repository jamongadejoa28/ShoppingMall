// ========================================
// User Routes - Framework 계층
// src/framework/routes/userRoutes.ts
// ========================================

import { Router, Request, Response, NextFunction } from 'express';
import { UserController } from '../controllers/UserController';
import { requireAuth, requireSelfOrAdmin } from '../middleware/authMiddleware';
import {
  validateUserRegistration,
  validateUserLogin,
  validateUserProfileUpdate,
  handleValidationErrors,
} from '../middleware/validationMiddleware';
import { asyncErrorCatcher } from '../middleware/errorMiddleware';

/**
 * User Routes - 사용자 관련 API 엔드포인트
 *
 * 역할:
 * - RESTful API 엔드포인트 정의
 * - Controller와 Middleware 연결
 * - 라우트별 인증/검증 규칙 적용
 *
 * API 설계 원칙:
 * - RESTful 규칙 준수
 * - 일관된 응답 형식
 * - 적절한 HTTP 상태 코드
 * - 보안 최우선 고려
 */

/**
 * 사용자 라우터 생성 함수
 *
 * 의존성 주입을 통해 Controller와 TokenService를 받아서
 * 완전한 라우터를 구성하여 반환
 */
export function createUserRoutes(
  userController: UserController,
  tokenService: any // TokenService 타입 (순환 참조 방지)
): Router {
  const router = Router();

  // ========================================
  // 공개 API (인증 불필요)
  // ========================================

  /**
   * 회원가입
   * POST /api/users/register
   *
   * Body: { name, email, password, role? }
   * Response: { success, message, data: { user, emailSent, emailError? } }
   */
  router.post(
    '/register',
    validateUserRegistration(),
    handleValidationErrors(),
    asyncErrorCatcher(userController.register)
  );

  /**
   * 로그인
   * POST /api/users/login
   *
   * Body: { email, password }
   * Response: { success, message, data: { user, accessToken, refreshToken, expiresIn } }
   */
  router.post(
    '/login',
    validateUserLogin(),
    handleValidationErrors(),
    asyncErrorCatcher(userController.login)
  );

  // ========================================
  // 보호된 API (인증 필요)
  // ========================================

  /**
   * 내 프로필 조회
   * GET /api/users/profile
   *
   * Headers: Authorization: Bearer <token>
   * Response: { success, message, data: { user } }
   */
  router.get(
    '/profile',
    requireAuth(tokenService),
    asyncErrorCatcher(userController.getProfile)
  );

  /**
   * 내 프로필 수정
   * PUT /api/users/profile
   *
   * Headers: Authorization: Bearer <token>
   * Body: { name?, phone?, address? }
   * Response: { success, message, data: { user } }
   */
  router.put(
    '/profile',
    requireAuth(tokenService),
    validateUserProfileUpdate(),
    handleValidationErrors(),
    asyncErrorCatcher(userController.updateProfile)
  );

  /**
   * 회원 탈퇴 (계정 비활성화)
   * DELETE /api/users/profile
   *
   * Headers: Authorization: Bearer <token>
   * Response: { success, message, data: { message, deactivatedAt, user } }
   */
  router.delete(
    '/profile',
    requireAuth(tokenService),
    asyncErrorCatcher(userController.deactivateAccount)
  );

  // ========================================
  // 관리자 또는 본인만 접근 가능한 API
  // ========================================

  /**
   * 특정 사용자 프로필 조회
   * GET /api/users/:userId
   *
   * Headers: Authorization: Bearer <token>
   * Params: { userId: string (UUID) }
   * Response: { success, message, data: { user } }
   *
   * 권한: 자기 자신 또는 관리자
   */
  router.get(
    '/:userId',
    requireAuth(tokenService),
    requireSelfOrAdmin(),
    asyncErrorCatcher(async (req, res, next) => {
      // UserController.getProfile을 재사용하되 userId 파라미터 활용
      const userId = req.params.userId;
      if (!userId) {
        res.status(400).json({
          success: false,
          message: '사용자 ID가 필요합니다',
          error: 'USER_ID_REQUIRED',
          data: null,
        });
        return;
      }

      // 임시로 user ID 변경 (타입 안전성 확보)
      const originalUserId = req.user!.id;
      req.user!.id = userId;

      try {
        await userController.getProfile(req, res, next);
      } finally {
        // 원본 user ID 복원
        req.user!.id = originalUserId;
      }
    })
  );

  /**
   * 특정 사용자 프로필 수정
   * PUT /api/users/:userId
   *
   * Headers: Authorization: Bearer <token>
   * Params: { userId: string (UUID) }
   * Body: { name?, phone?, address? }
   * Response: { success, message, data: { user } }
   *
   * 권한: 자기 자신 또는 관리자
   */
  router.put(
    '/:userId',
    requireAuth(tokenService),
    requireSelfOrAdmin(),
    validateUserProfileUpdate(),
    handleValidationErrors(),
    asyncErrorCatcher(
      async (req: Request, res: Response, next: NextFunction) => {
        // UserController.updateProfile을 재사용하되 userId 파라미터 활용
        const userId = req.params.userId;
        if (!userId) {
          res.status(400).json({
            success: false,
            message: '사용자 ID가 필요합니다',
            error: 'USER_ID_REQUIRED',
            data: null,
          });
          return;
        }

        // 임시로 user ID 변경 (타입 안전성 확보)
        const originalUserId = req.user!.id;
        req.user!.id = userId;

        try {
          await userController.updateProfile(req, res, next);
        } finally {
          // 원본 user ID 복원
          req.user!.id = originalUserId;
        }
      }
    )
  );

  /**
   * 특정 사용자 계정 비활성화
   * DELETE /api/users/:userId
   *
   * Headers: Authorization: Bearer <token>
   * Params: { userId: string (UUID) }
   * Response: { success, message, data: { message, deactivatedAt, user } }
   *
   * 권한: 자기 자신 또는 관리자
   */
  router.delete(
    '/:userId',
    requireAuth(tokenService),
    requireSelfOrAdmin(),
    asyncErrorCatcher(async (req, res, next) => {
      // UserController.deactivateAccount를 재사용하되 userId 파라미터 활용
      const userId = req.params.userId;
      if (!userId) {
        res.status(400).json({
          success: false,
          message: '사용자 ID가 필요합니다',
          error: 'USER_ID_REQUIRED',
          data: null,
        });
        return;
      }

      // 임시로 user ID 변경 (타입 안전성 확보)
      const originalUserId = req.user!.id;
      req.user!.id = userId;

      try {
        await userController.deactivateAccount(req, res, next);
      } finally {
        // 원본 user ID 복원
        req.user!.id = originalUserId;
      }
    })
  );

  // ========================================
  // 헬스 체크 및 정보 API
  // ========================================

  /**
   * 사용자 서비스 헬스 체크
   * GET /api/users/health
   *
   * Response: { success, message, data: { status, timestamp, version } }
   */
  router.get(
    '/health',
    asyncErrorCatcher(async (req, res) => {
      res.status(200).json({
        success: true,
        message: 'User Service가 정상적으로 작동중입니다',
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: process.env.SERVICE_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime(),
        },
      });
    })
  );

  /**
   * 사용자 서비스 정보
   * GET /api/users/info
   *
   * Response: { success, message, data: { name, version, description } }
   */
  router.get(
    '/info',
    asyncErrorCatcher(async (req, res) => {
      res.status(200).json({
        success: true,
        message: 'User Service 정보',
        data: {
          name: 'User Service',
          version: process.env.SERVICE_VERSION || '1.0.0',
          description:
            'Clean Architecture 기반 마이크로서비스 사용자 관리 서비스',
          features: [
            '사용자 등록/로그인',
            'JWT 인증',
            '프로필 관리',
            '계정 비활성화',
            '이메일 인증',
          ],
          architecture: 'Clean Architecture',
          framework: 'Express.js + TypeScript',
          database: 'PostgreSQL',
          authentication: 'JWT',
        },
      });
    })
  );

  return router;
}

// ========================================
// API 문서화용 라우트 정보
// ========================================

/**
 * User Service API 엔드포인트 목록
 *
 * 공개 API:
 * - POST /api/users/register      - 회원가입
 * - POST /api/users/login         - 로그인
 * - GET  /api/users/health        - 헬스 체크
 * - GET  /api/users/info          - 서비스 정보
 *
 * 인증 필요 API:
 * - GET    /api/users/profile     - 내 프로필 조회
 * - PUT    /api/users/profile     - 내 프로필 수정
 * - DELETE /api/users/profile     - 내 계정 비활성화
 *
 * 본인/관리자 API:
 * - GET    /api/users/:userId     - 특정 사용자 프로필 조회
 * - PUT    /api/users/:userId     - 특정 사용자 프로필 수정
 * - DELETE /api/users/:userId     - 특정 사용자 계정 비활성화
 */

// ========================================
// HTTP 상태 코드 가이드
// ========================================

/**
 * 사용되는 HTTP 상태 코드:
 *
 * 성공:
 * - 200 OK: 조회, 수정 성공
 * - 201 Created: 회원가입 성공
 *
 * 클라이언트 에러:
 * - 400 Bad Request: 입력 데이터 검증 실패
 * - 401 Unauthorized: 인증 필요 또는 토큰 무효
 * - 403 Forbidden: 권한 없음
 * - 404 Not Found: 사용자 없음
 * - 409 Conflict: 이메일 중복 등
 *
 * 서버 에러:
 * - 500 Internal Server Error: 서버 내부 오류
 * - 503 Service Unavailable: 외부 서비스 오류
 */

// ========================================
// 응답 형식 표준
// ========================================

/**
 * 모든 API 응답은 다음 형식을 따름:
 *
 * 성공 응답:
 * {
 *   "success": true,
 *   "message": "작업 완료 메시지",
 *   "data": { ... } // 실제 데이터
 * }
 *
 * 실패 응답:
 * {
 *   "success": false,
 *   "message": "에러 메시지",
 *   "error": "ERROR_CODE",
 *   "data": null,
 *   "details"?: { ... } // 개발 환경에서만
 * }
 */
