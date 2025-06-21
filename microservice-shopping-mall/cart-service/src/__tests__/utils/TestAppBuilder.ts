// cart-service/src/__tests__/utils/TestAppBuilder.ts
// ========================================

import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import "reflect-metadata";
import { Container } from "inversify";
import { CartController } from "../../frameworks/controllers/CartController";
import { TYPES } from "../../infrastructure/di/types";

/**
 * 테스트용 Express 애플리케이션 빌더
 *
 * 실제 프로덕션 server.ts 파일을 수정하지 않고
 * 통합 테스트에서 사용할 Express 앱을 생성합니다.
 */
export class TestAppBuilder {
  private app: Express;
  private container: Container;

  constructor(container: Container) {
    this.app = express();
    this.container = container;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * 기본 미들웨어 설정
   */
  private setupMiddleware(): void {
    // 보안 헤더
    this.app.use(
      helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      })
    );

    // CORS 설정
    this.app.use(
      cors({
        origin: true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );

    // 압축
    this.app.use(compression());

    // JSON 파싱
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  }

  /**
   * API 라우트 설정
   */
  private setupRoutes(): void {
    // 헬스체크 엔드포인트
    this.app.get("/health", (req, res) => {
      res.status(200).json({
        success: true,
        message: "Cart Service Test Environment",
        data: {
          status: "healthy",
          timestamp: new Date().toISOString(),
          version: "1.0.0-test",
          environment: "test",
        },
      });
    });

    // 서비스 정보 엔드포인트
    this.app.get("/api/v1/info", (req, res) => {
      res.status(200).json({
        success: true,
        message: "Cart Service API Info",
        data: {
          service: "cart-service",
          version: "1.0.0-test",
          description:
            "Clean Architecture 기반 장바구니 관리 마이크로서비스 (테스트 환경)",
          endpoints: {
            carts: "/api/v1/carts",
            health: "/health",
          },
          features: [
            "장바구니 생성/조회",
            "상품 추가/수정/삭제",
            "사용자/세션 기반 관리",
            "캐시 최적화",
            "동시성 처리",
          ],
        },
        timestamp: new Date().toISOString(),
      });
    });

    // Cart Controller 라우트 설정
    try {
      const cartController = this.container.get<CartController>(
        TYPES.CartController
      );

      // 장바구니 API 라우트들
      this.app.post(
        "/api/v1/carts/items",
        cartController.addToCart.bind(cartController)
      );
      this.app.get(
        "/api/v1/carts",
        cartController.getCart.bind(cartController)
      );
      this.app.put(
        "/api/v1/carts/items",
        cartController.updateCartItem.bind(cartController)
      );
      this.app.delete(
        "/api/v1/carts/items",
        cartController.removeFromCart.bind(cartController)
      );
      this.app.delete(
        "/api/v1/carts",
        cartController.clearCart.bind(cartController)
      );
      this.app.post(
        "/api/v1/carts/transfer",
        cartController.transferCart.bind(cartController)
      );
    } catch (error) {
      console.error("❌ [TestAppBuilder] CartController 바인딩 실패:", error);

      // fallback 라우트들 (Controller가 없을 경우)
      this.app.post("/api/v1/carts/items", (req, res) => {
        res.status(500).json({
          success: false,
          message: "CartController not available in test environment",
          error: "CONTROLLER_NOT_FOUND",
        });
      });
    }
  }

  /**
   * 에러 핸들링 설정
   */
  private setupErrorHandling(): void {
    // 404 핸들러
    this.app.use("*", (req, res) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        error: "NOT_FOUND",
        timestamp: new Date().toISOString(),
      });
    });

    // 전역 에러 핸들러
    this.app.use((error: any, req: any, res: any, next: any) => {
      console.error("❌ [TestApp] Unhandled Error:", error);

      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Internal Server Error",
        error: error.code || "INTERNAL_SERVER_ERROR",
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === "test" && { stack: error.stack }),
      });
    });
  }

  /**
   * Express 앱 반환
   */
  getApp(): Express {
    return this.app;
  }
}

/**
 * 테스트용 Express 앱 생성 헬퍼 함수
 */
export async function createTestApp(container: Container): Promise<Express> {
  const builder = new TestAppBuilder(container);
  return builder.getApp();
}
