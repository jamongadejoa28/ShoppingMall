// ========================================
// User Routes - Framework 계층 (완전 수정됨)
// src/frameworks/routes/userRoutes.ts
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
 * 사용자 라우터 생성 함수
 */
export function createUserRoutes(
  userController: UserController,
  tokenService: any
): Router {
  const router = Router();

  // ========================================
  // 🔧 수정: 헬스 체크 및 정보 API를 최상단으로 이동
  // (인증 미들웨어 적용 전에 배치)
  // ========================================

  /**
   * 사용자 서비스 헬스 체크
   * GET /api/users/health
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

  // ========================================
  // 공개 API (인증 불필요)
  // ========================================

  /**
   * 회원가입
   * POST /api/users/register
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
   */
  router.post(
    '/login',
    validateUserLogin(),
    handleValidationErrors(),
    asyncErrorCatcher(userController.login)
  );

  /**
   * 토큰 갱신 (Refresh Token)
   * POST /api/users/refresh
   */
  router.post(
    '/refresh',
    asyncErrorCatcher(async (req: Request, res: Response) => {
      try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
          res.status(400).json({
            success: false,
            message: 'Refresh Token이 필요합니다',
            error: 'REFRESH_TOKEN_REQUIRED',
            data: null,
          });
          return;
        }

        // Refresh Token 검증
        const refreshPayload = tokenService.verifyRefreshToken(refreshToken);

        if (!refreshPayload) {
          res.status(401).json({
            success: false,
            message: '유효하지 않거나 만료된 Refresh Token입니다',
            error: 'INVALID_REFRESH_TOKEN',
            data: null,
          });
          return;
        }

        // 사용자 정보로 새 토큰 쌍 생성
        const newTokens = {
          accessToken: tokenService.generateAccessToken({
            id: refreshPayload.id,
            email: refreshPayload.email,
            role: 'customer', // 실제로는 DB에서 조회해야 함
          }),
          refreshToken: tokenService.generateRefreshToken({
            id: refreshPayload.id,
            email: refreshPayload.email,
          }),
          expiresIn: tokenService.getTokenExpirationTime(),
        };

        res.status(200).json({
          success: true,
          message: '토큰이 성공적으로 갱신되었습니다',
          data: newTokens,
        });
      } catch (error) {
        console.error('[Refresh Token] 오류:', error);
        res.status(500).json({
          success: false,
          message: '토큰 갱신 중 오류가 발생했습니다',
          error: 'TOKEN_REFRESH_ERROR',
          data: null,
        });
      }
    })
  );

  // ========================================
  // 보호된 API (인증 필요)
  // ========================================

  /**
   * 내 프로필 조회
   * GET /api/users/profile
   */
  router.get(
    '/profile',
    requireAuth(tokenService),
    asyncErrorCatcher(userController.getProfile)
  );

  /**
   * 내 프로필 수정
   * PUT /api/users/profile
   */
  router.put(
    '/profile',
    requireAuth(tokenService),
    validateUserProfileUpdate(),
    handleValidationErrors(),
    asyncErrorCatcher(userController.updateProfile)
  );

  /**
   * 내 계정 비활성화
   * DELETE /api/users/profile
   */
  router.delete(
    '/profile',
    requireAuth(tokenService),
    asyncErrorCatcher(userController.deactivateAccount)
  );

  // ========================================
  // 🔧 수정: 본인 또는 관리자만 접근 가능한 API
  // requireSelfOrAdmin() - 매개변수 없이 호출
  // ========================================

  /**
   * 특정 사용자 프로필 조회
   * GET /api/users/:userId
   */
  router.get(
    '/:userId',
    requireAuth(tokenService),
    requireSelfOrAdmin(), // 🔧 수정: 매개변수 제거
    asyncErrorCatcher(
      async (req: Request, res: Response, next: NextFunction) => {
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

        // 🔧 수정: 타입 안전성 개선
        const originalUserId = req.user?.id;
        if (req.user) {
          req.user.id = userId;
        }

        try {
          await userController.getProfile(req, res, next);
        } finally {
          // 원본 user ID 복원
          if (req.user && originalUserId) {
            req.user.id = originalUserId;
          }
        }
      }
    )
  );

  /**
   * 특정 사용자 프로필 수정
   * PUT /api/users/:userId
   */
  router.put(
    '/:userId',
    requireAuth(tokenService),
    requireSelfOrAdmin(), // 🔧 수정: 매개변수 제거
    validateUserProfileUpdate(),
    handleValidationErrors(),
    asyncErrorCatcher(
      async (req: Request, res: Response, next: NextFunction) => {
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

        // 🔧 수정: 타입 안전성 개선
        const originalUserId = req.user?.id;
        if (req.user) {
          req.user.id = userId;
        }

        try {
          await userController.updateProfile(req, res, next);
        } finally {
          // 원본 user ID 복원
          if (req.user && originalUserId) {
            req.user.id = originalUserId;
          }
        }
      }
    )
  );

  /**
   * 특정 사용자 계정 비활성화
   * DELETE /api/users/:userId
   */
  router.delete(
    '/:userId',
    requireAuth(tokenService),
    requireSelfOrAdmin(), // 🔧 수정: 매개변수 제거
    asyncErrorCatcher(
      async (req: Request, res: Response, next: NextFunction) => {
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

        // 🔧 수정: 타입 안전성 개선
        const originalUserId = req.user?.id;
        if (req.user) {
          req.user.id = userId;
        }

        try {
          await userController.deactivateAccount(req, res, next);
        } finally {
          // 원본 user ID 복원
          if (req.user && originalUserId) {
            req.user.id = originalUserId;
          }
        }
      }
    )
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
