import { Request, Response, NextFunction } from "express";
import { ValidationError } from "express-validator";
import {
  ApiResponse,
  HTTP_STATUS,
  ErrorCode,
  createLogger,
  getCurrentTimestamp,
} from "@shopping-mall/shared";

const logger = createLogger("api-gateway");

// ========================================
// 커스텀 에러 클래스들
// ========================================
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode = ErrorCode.INTERNAL_ERROR,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationAppError extends AppError {
  public readonly validationErrors: ValidationError[];

  constructor(message: string, validationErrors: ValidationError[]) {
    super(message, HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    this.validationErrors = validationErrors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "인증이 필요합니다") {
    super(message, HTTP_STATUS.UNAUTHORIZED, ErrorCode.AUTHENTICATION_ERROR);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "권한이 없습니다") {
    super(message, HTTP_STATUS.FORBIDDEN, ErrorCode.AUTHORIZATION_ERROR);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "리소스를 찾을 수 없습니다") {
    super(message, HTTP_STATUS.NOT_FOUND, ErrorCode.NOT_FOUND_ERROR);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "리소스 충돌이 발생했습니다") {
    super(message, HTTP_STATUS.CONFLICT, ErrorCode.CONFLICT_ERROR);
  }
}

// ========================================
// 에러 핸들러 미들웨어
// ========================================
export const errorHandler = (
  error: Error,
  req: any,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let errorCode = ErrorCode.INTERNAL_ERROR;
  let message = "내부 서버 오류가 발생했습니다";
  let details: any = undefined;

  // AppError 인스턴스인 경우
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.errorCode;
    message = error.message;

    // ValidationAppError인 경우 유효성 검사 세부사항 추가
    if (error instanceof ValidationAppError) {
      details = {
        validationErrors: error.validationErrors.map((err) => ({
          field: err.type === "field" ? err.path : undefined,
          message: err.msg,
          value: err.type === "field" ? err.value : undefined,
        })),
      };
    }
  }
  // JWT 관련 에러
  else if (error.name === "JsonWebTokenError") {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorCode = ErrorCode.AUTHENTICATION_ERROR;
    message = "유효하지 않은 토큰입니다";
  } else if (error.name === "TokenExpiredError") {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorCode = ErrorCode.AUTHENTICATION_ERROR;
    message = "토큰이 만료되었습니다";
  }
  // Syntax Error (잘못된 JSON 등)
  else if (error instanceof SyntaxError && "body" in error) {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ErrorCode.VALIDATION_ERROR;
    message = "잘못된 요청 형식입니다";
  }
  // 기타 알려진 에러들
  else if (error.name === "CastError") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    errorCode = ErrorCode.VALIDATION_ERROR;
    message = "잘못된 데이터 형식입니다";
  }

  // 로깅
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      id: req.id,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    },
    statusCode,
    errorCode,
  };

  if (statusCode >= 500) {
    logger.error("Server Error:", logData);
  } else {
    logger.warn("Client Error:", logData);
  }

  // 응답 생성
  const response: ApiResponse = {
    success: false,
    data: null,
    error: message,
    timestamp: getCurrentTimestamp(),
    requestId: req.id || "unknown",
  };

  // 개발 환경에서는 추가 정보 제공
  if (process.env.NODE_ENV === "development") {
    response.error = message;
    if (details) {
      (response as any).details = details;
    }
    // 스택 트레이스는 500 에러에서만 제공
    if (statusCode >= 500) {
      (response as any).stack = error.stack;
    }
  }

  res.status(statusCode).json(response);
};

// ========================================
// 비동기 에러 핸들러 래퍼
// ========================================
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ========================================
// 유효성 검사 에러 생성 헬퍼
// ========================================
export const createValidationError = (
  message: string,
  validationErrors: ValidationError[]
): ValidationAppError => {
  return new ValidationAppError(message, validationErrors);
};

// ========================================
// 404 에러 핸들러
// ========================================
export const notFoundHandler = (
  req: any,
  res: Response,
  next: NextFunction
): void => {
  const error = new NotFoundError(
    `경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`
  );
  next(error);
};

// ========================================
// 프로세스 종료 이벤트 핸들러
// ========================================
export const handleProcessExit = () => {
  process.on(
    "unhandledRejection",
    (reason: unknown, promise: Promise<unknown>) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    }
  );

  process.on("uncaughtException", (error: Error) => {
    logger.error("Uncaught Exception thrown:", error);
    process.exit(1);
  });
};
