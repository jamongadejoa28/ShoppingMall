// ========================================
// Common Middlewares - 공통 미들웨어
// src/frameworks/web/middlewares/common.ts
// ========================================

import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { HTTP_HEADERS, ApiResponse } from "../../shared/types";

/**
 * Request ID 생성 미들웨어
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId =
    (req.headers[HTTP_HEADERS.REQUEST_ID] as string) || uuidv4();
  (req as any).requestId = requestId;
  res.setHeader(HTTP_HEADERS.REQUEST_ID, requestId);
  next();
}

/**
 * 로깅 미들웨어
 */
export function loggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const requestId = (req as any).requestId;

  console.log(
    `[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl} - START`,
    {
      method: req.method,
      url: req.originalUrl,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      queryParams: Object.keys(req.query).length > 0 ? req.query : undefined,
    }
  );

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
}

/**
 * 에러 핸들링 미들웨어
 */
export function errorHandlingMiddleware(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = (req as any).requestId || "unknown";
  const timestamp = new Date().toISOString();

  console.error(`[${timestamp}] [${requestId}] ERROR:`, {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
  });

  if (res.headersSent) {
    return next(error);
  }

  const response: ApiResponse<null> = {
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "서버 내부 오류가 발생했습니다"
        : error.message,
    error: {
      code: error.code || "INTERNAL_ERROR",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    },
    data: null,
    timestamp,
    requestId,
  };

  res.status(error.statusCode || 500).json(response);
}

/**
 * 404 Not Found 핸들러
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = (req as any).requestId || "unknown";

  const response: ApiResponse<null> = {
    success: false,
    message: `요청하신 경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}`,
    error: {
      code: "NOT_FOUND",
    },
    data: null,
    timestamp: new Date().toISOString(),
    requestId,
  };

  res.status(404).json(response);
}

/**
 * 헬스체크 핸들러
 */
export function healthCheckHandler(req: Request, res: Response): void {
  const requestId = (req as any).requestId || "unknown";

  const response: ApiResponse<any> = {
    success: true,
    message: "Product Service is healthy",
    data: {
      service: "product-service",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    },
    timestamp: new Date().toISOString(),
    requestId,
  };

  res.status(200).json(response);
}
