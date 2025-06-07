import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import {
  createLogger,
  generateTokenPair,
  verifyRefreshToken,
  ApiResponse,
  HTTP_STATUS,
  User,
  UserRole,
  TokenPair,
  ErrorCode,
} from "@shopping-mall/shared";
import { asyncHandler, createValidationError } from "@middleware/errorHandler";

const router = Router();
const logger = createLogger("api-gateway");

// ===== Mock 사용자 데이터 (실제 서비스 구현 전까지 사용) =====
// 실제로는 User Service에서 가져올 데이터
const mockUsers: User[] = [
  {
    id: "user-1",
    email: "admin@example.com",
    name: "관리자",
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
  {
    id: "user-2",
    email: "customer@example.com",
    name: "고객",
    role: UserRole.CUSTOMER,
    isActive: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
  },
];

// Mock 비밀번호 (실제로는 해시된 상태로 DB에 저장)
const mockPasswords: Record<string, string> = {
  "admin@example.com":
    "$2a$10$N9qo8uLOickgx2ZMRZoMye1F1YhvIc1d8z7l9r7Z9Z4v1F1YhvIc1d", // "admin123"
  "customer@example.com":
    "$2a$10$N9qo8uLOickgx2ZMRZoMye1F1YhvIc1d8z7l9r7Z9Z4v1F1YhvIc1d", // "customer123"
};

// 리프레시 토큰 저장소 (실제로는 Redis에 저장)
const refreshTokenStore = new Set<string>();

// ===== 유효성 검사 규칙 =====
const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("유효한 이메일을 입력해주세요"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("비밀번호는 최소 6자 이상이어야 합니다"),
];

const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2 })
    .withMessage("이름은 최소 2자 이상이어야 합니다"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("유효한 이메일을 입력해주세요"),
  body("password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "비밀번호는 최소 8자이며, 대문자, 소문자, 숫자를 포함해야 합니다"
    ),
];

const refreshTokenValidation = [
  body("refreshToken").notEmpty().withMessage("리프레시 토큰이 필요합니다"),
];

// ===== 헬퍼 함수 =====
const findUserByEmail = (email: string): User | undefined => {
  return mockUsers.find((user) => user.email === email && user.isActive);
};

const checkValidationErrors = (req: Request): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError(
      "입력 데이터가 올바르지 않습니다",
      errors.array()
    );
  }
};

// ===== 라우트 정의 =====

/**
 * @route POST /auth/login
 * @desc 사용자 로그인
 */
router.post(
  "/login",
  loginValidation,
  asyncHandler(async (req: Request, res: Response) => {
    checkValidationErrors(req);

    const { email, password } = req.body;

    // 사용자 찾기
    const user = findUserByEmail(email);
    if (!user) {
      logger.warn("Login attempt with invalid email", { email, ip: req.ip });

      const response: ApiResponse = {
        success: false,
        data: null,
        error: "이메일 또는 비밀번호가 올바르지 않습니다",
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
      };

      return res.status(HTTP_STATUS.UNAUTHORIZED).json(response);
    }

    // 비밀번호 확인 (Mock - 실제로는 bcrypt.compare 사용)
    const storedPassword = mockPasswords[email];
    if (!storedPassword) {
      logger.error("No password found for user", { email, userId: user.id });

      const response: ApiResponse = {
        success: false,
        data: null,
        error: "로그인 처리 중 오류가 발생했습니다",
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
      };

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(response);
    }

    // 개발용 간단 비밀번호 체크 (실제로는 bcrypt 사용)
    const isValidPassword =
      password === "admin123" || password === "customer123";
    if (!isValidPassword) {
      logger.warn("Login attempt with invalid password", {
        email,
        userId: user.id,
        ip: req.ip,
      });

      const response: ApiResponse = {
        success: false,
        data: null,
        error: "이메일 또는 비밀번호가 올바르지 않습니다",
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
      };

      return res.status(HTTP_STATUS.UNAUTHORIZED).json(response);
    }

    // 토큰 생성
    const tokens = generateTokenPair(user);

    // 리프레시 토큰 저장
    refreshTokenStore.add(tokens.refreshToken);

    logger.info("User logged in successfully", {
      userId: user.id,
      email: user.email,
      ip: req.ip,
    });

    const response: ApiResponse<{ user: User; tokens: TokenPair }> = {
      success: true,
      data: {
        user,
        tokens,
      },
      message: "로그인 성공",
      timestamp: new Date().toISOString(),
      requestId: (req as any).id,
    };

    res.status(HTTP_STATUS.OK).json(response);
  })
);

/**
 * @route POST /auth/register
 * @desc 사용자 회원가입 (Mock)
 */
router.post(
  "/register",
  registerValidation,
  asyncHandler(async (req: Request, res: Response) => {
    checkValidationErrors(req);

    const { name, email, password } = req.body;

    // 이메일 중복 확인
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      logger.warn("Registration attempt with existing email", {
        email,
        ip: req.ip,
      });

      const response: ApiResponse = {
        success: false,
        data: null,
        error: "이미 존재하는 이메일입니다",
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
      };

      return res.status(HTTP_STATUS.CONFLICT).json(response);
    }

    // 새 사용자 생성 (Mock)
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      name,
      role: UserRole.CUSTOMER,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock 데이터에 추가
    mockUsers.push(newUser);
    mockPasswords[email] = password; // 실제로는 해시해서 저장

    // 토큰 생성
    const tokens = generateTokenPair(newUser);

    // 리프레시 토큰 저장
    refreshTokenStore.add(tokens.refreshToken);

    logger.info("User registered successfully", {
      userId: newUser.id,
      email: newUser.email,
      ip: req.ip,
    });

    const response: ApiResponse<{ user: User; tokens: TokenPair }> = {
      success: true,
      data: {
        user: newUser,
        tokens,
      },
      message: "회원가입 성공",
      timestamp: new Date().toISOString(),
      requestId: (req as any).id,
    };

    res.status(HTTP_STATUS.CREATED).json(response);
  })
);

/**
 * @route POST /auth/refresh
 * @desc 토큰 갱신
 */
router.post(
  "/refresh",
  refreshTokenValidation,
  asyncHandler(async (req: Request, res: Response) => {
    checkValidationErrors(req);

    const { refreshToken } = req.body;

    // 리프레시 토큰 유효성 확인
    if (!refreshTokenStore.has(refreshToken)) {
      logger.warn("Invalid refresh token used", {
        token: refreshToken.substring(0, 20) + "...",
        ip: req.ip,
      });

      const response: ApiResponse = {
        success: false,
        data: null,
        error: "유효하지 않은 리프레시 토큰입니다",
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
      };

      return res.status(HTTP_STATUS.UNAUTHORIZED).json(response);
    }

    // 토큰 검증 및 페이로드 추출
    const payload = verifyRefreshToken(refreshToken);

    // 사용자 정보 조회
    const user = mockUsers.find((u) => u.id === payload.userId);
    if (!user || !user.isActive) {
      logger.warn("Refresh token for inactive/missing user", {
        userId: payload.userId,
      });

      // 무효한 토큰 제거
      refreshTokenStore.delete(refreshToken);

      const response: ApiResponse = {
        success: false,
        data: null,
        error: "사용자를 찾을 수 없습니다",
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
      };

      return res.status(HTTP_STATUS.UNAUTHORIZED).json(response);
    }

    // 새 토큰 생성
    const newTokens = generateTokenPair(user);

    // 기존 리프레시 토큰 제거하고 새 토큰 저장
    refreshTokenStore.delete(refreshToken);
    refreshTokenStore.add(newTokens.refreshToken);

    logger.info("Tokens refreshed successfully", { userId: user.id });

    const response: ApiResponse<TokenPair> = {
      success: true,
      data: newTokens,
      message: "토큰 갱신 성공",
      timestamp: new Date().toISOString(),
      requestId: (req as any).id,
    };

    res.status(HTTP_STATUS.OK).json(response);
  })
);

/**
 * @route POST /auth/logout
 * @desc 로그아웃
 */
router.post(
  "/logout",
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (refreshToken && refreshTokenStore.has(refreshToken)) {
      refreshTokenStore.delete(refreshToken);
      logger.info("User logged out", { ip: req.ip });
    }

    const response: ApiResponse = {
      success: true,
      data: null,
      message: "로그아웃 성공",
      timestamp: new Date().toISOString(),
      requestId: (req as any).id,
    };

    res.status(HTTP_STATUS.OK).json(response);
  })
);

/**
 * @route GET /auth/me
 * @desc 현재 사용자 정보 조회 (인증 필요)
 */
router.get(
  "/me",
  asyncHandler(async (req: Request, res: Response) => {
    // 실제로는 인증 미들웨어에서 처리하지만, 여기서는 간단히 구현
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      const response: ApiResponse = {
        success: false,
        data: null,
        error: "인증이 필요합니다",
        timestamp: new Date().toISOString(),
        requestId: (req as any).id,
      };

      return res.status(HTTP_STATUS.UNAUTHORIZED).json(response);
    }

    // Mock 사용자 반환 (실제로는 토큰에서 사용자 ID 추출 후 DB 조회)
    const mockCurrentUser = mockUsers[0]; // 간단히 첫 번째 사용자 반환

    const response: ApiResponse<User> = {
      success: true,
      data: mockCurrentUser,
      message: "사용자 정보 조회 성공",
      timestamp: new Date().toISOString(),
      requestId: (req as any).id,
    };

    res.status(HTTP_STATUS.OK).json(response);
  })
);

export { router as authRoutes };
