// ========================================
// Express Server Main Entry Point
// src/server.ts
// ========================================

import compression from "compression";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { DatabaseConfig } from "./infrastructure/config/DatabaseConfig";
import { DIContainer } from "./infrastructure/di/Container";
import { TYPES } from "./infrastructure/di/types";
// 기존 imports 뒤에 추가
import {
  errorHandlingMiddleware,
  healthCheckHandler,
  notFoundHandler,
} from "./frameworks/middlewares/common";
import { createProductRoutes } from "./frameworks/routes/productRoutes";
import {
  setupSwagger,
  validateSwaggerSpec,
  logSwaggerInfo,
} from "./infrastructure/swagger/swaggerMiddleware";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
// 환경 변수 로드
config();

/**
 * Express 애플리케이션 설정 및 시작
 */
class ProductServiceApp {
  private app: express.Application;
  private readonly PORT: number;

  constructor() {
    this.app = express();
    this.PORT = parseInt(process.env.PORT || "3003");
  }

  /**
   * 애플리케이션 초기화
   */
  async initialize(): Promise<void> {
    try {
      console.log("🚀 [ProductService] 애플리케이션 초기화 시작...");

      // 1. DI Container 초기화
      console.log("📦 [ProductService] DI Container 초기화 중...");
      await DIContainer.create();
      console.log("✅ [ProductService] DI Container 초기화 완료");

      // 2. 미들웨어 설정
      this.setupMiddlewares();
      console.log("✅ [ProductService] 미들웨어 설정 완료");

      this.setupSwagger();

      // 3. 라우트 설정
      this.setupRoutes();
      console.log("✅ [ProductService] 라우트 설정 완료");

      // 4. 에러 핸들링 설정
      this.setupErrorHandling();
      console.log("✅ [ProductService] 에러 핸들링 설정 완료");

      console.log("🎉 [ProductService] 애플리케이션 초기화 완료!");
    } catch (error) {
      console.error("❌ [ProductService] 애플리케이션 초기화 실패:", error);
      throw error;
    }
  }

  /**
   * 미들웨어 설정
   */
  private setupMiddlewares(): void {
    // 보안 헤더 설정
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
      })
    );

    // CORS 설정
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN?.split(",") || [
          "http://localhost:3000",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );

    // 압축 설정
    this.app.use(compression());

    // 요청 제한 설정
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"), // 15분
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "1000"), // 1000 요청
      message: {
        error: "Too many requests from this IP",
        retryAfter: "15 minutes",
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // JSON 파싱 설정
    this.app.use(
      express.json({
        limit: process.env.MAX_FILE_SIZE || "10mb",
      })
    );
    this.app.use(
      express.urlencoded({
        extended: true,
        limit: process.env.MAX_FILE_SIZE || "10mb",
      })
    );

    // 요청 로깅 미들웨어
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(
          `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`
        );
      });
      next();
    });
  }

  // 🚀 2. Swagger 설정 (클래스 내부에 추가)
  private setupSwagger(): void {
    try {
      // 간단한 Swagger 설정
      const swaggerOptions = {
        definition: {
          openapi: "3.0.0",
          info: {
            title: "Product Service API",
            version: "1.0.0",
            description: "Clean Architecture 기반 상품 관리 마이크로서비스",
          },
          servers: [
            {
              url: `http://localhost:${this.PORT}`,
              description: "개발 서버",
            },
          ],
          tags: [
            {
              name: "Products",
              description: "상품 관리 API",
            },
            {
              name: "Health",
              description: "서비스 상태 확인",
            },
          ],
        },
        apis: ["./src/**/*.ts"], // TypeScript 파일에서 JSDoc 주석 스캔
      };

      const swaggerSpec = swaggerJSDoc(swaggerOptions);

      // Swagger JSON 엔드포인트
      this.app.get("/api/docs/json", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.json(swaggerSpec);
      });

      // Swagger UI 설정
      this.app.use(
        "/api/docs",
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec, {
          explorer: true,
          customSiteTitle: "Product Service API",
          customCss: ".swagger-ui .topbar { display: none; }",
        })
      );

      console.log("✅ [ProductService] Swagger 설정 완료");
    } catch (error) {
      console.error("❌ [ProductService] Swagger 설정 실패:", error);
    }
  }

  /**
   * 라우트 설정
   */
  private setupRoutes(): void {
    // Health Check (Root)
    this.app.get("/", (req, res) => {
      res.redirect("/api/docs");
    });
    /**
     * @swagger
     * /health:
     *   get:
     *     tags: [Health]
     *     summary: 서비스 상태 확인
     *     responses:
     *       200:
     *         description: 서비스 정상 작동
     */
    this.app.get("/health", healthCheckHandler);

    // API 정보
    this.app.get("/api", (req, res) => {
      const requestId = (req as any).requestId || "unknown";
      res.json({
        success: true,
        message: "Product Service API",
        data: {
          service: "product-service",
          version: "1.0.0",
          description: "Clean Architecture 기반 상품 관리 마이크로서비스",
          endpoints: {
            products: "/api/v1/products",
            health: "/health",
            docs: "/api/docs",
            spec: "/api/docs/json",
          },
          features: [
            "상품 생성/조회/목록",
            "카테고리 기반 분류",
            "재고 관리 연동",
            "검색 및 필터링",
            "캐시 최적화",
            "🚀 Swagger API 문서화",
          ],
        },
        timestamp: new Date().toISOString(),
        requestId,
      });
    });

    this.app.get("/test/database", async (req, res) => {
      try {
        const container = DIContainer.getContainer();
        const dataSource = container.get<DataSource>(TYPES.DataSource);

        // 한글 데이터 직접 조회
        const result = await dataSource.query(`
          SELECT name, brand, description 
          FROM products 
          WHERE sku LIKE 'TEST%' 
          ORDER BY "createdAt" DESC
        `);

        res.json({
          success: true,
          message: "데이터베이스 한글 데이터 확인",
          data: result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "데이터베이스 조회 실패",
          error: console.error(
            "❌ [ProductService] 서버 시작 실패:",
            (error as Error).message
          ),
        });
      }
    });

    // API v1 Routes - 새로운 REST API 추가!
    this.app.use("/api/v1/products", createProductRoutes());

    console.log("✅ [ProductService] API 라우트 설정 완료");
    console.log("📋 [ProductService] 사용 가능한 엔드포인트:");
    console.log("   GET  /              - Health Check");
    console.log("   GET  /health        - Health Check");
    console.log("   GET  /api           - API 정보");
    console.log("   POST /api/v1/products       - 상품 생성");
    console.log("   GET  /api/v1/products       - 상품 목록 조회");
    console.log("   GET  /api/v1/products/:id   - 상품 상세 조회");
  }

  /**
   * 에러 핸들링 설정
   */
  private setupErrorHandling(): void {
    // 404 Not Found
    this.app.use(notFoundHandler);

    // Global Error Handler
    this.app.use(errorHandlingMiddleware);

    console.log("✅ [ProductService] 에러 핸들링 설정 완료");
  }

  /**
   * 서버 시작
   */
  async start(): Promise<void> {
    try {
      await this.initialize();

      this.app.listen(this.PORT, () => {
        console.log(
          `🚀 [ProductService] 서버가 포트 ${this.PORT}에서 실행 중입니다.`
        );
        console.log(
          `📍 [ProductService] Health Check: http://localhost:${this.PORT}/health`
        );
        console.log(
          `📍 [ProductService] API Info: http://localhost:${this.PORT}/`
        );
        // 🚀 Swagger 링크 추가
        console.log(
          `📚 [ProductService] API Docs: http://localhost:${this.PORT}/api/docs`
        );
        console.log(
          `📄 [ProductService] API Spec: http://localhost:${this.PORT}/api/docs/json`
        );

        if (process.env.NODE_ENV === "development") {
          console.log(`🧪 [ProductService] 테스트 엔드포인트:`);
          console.log(
            `   - Database: http://localhost:${this.PORT}/test/database`
          );
          console.log(`   - Redis: http://localhost:${this.PORT}/test/redis`);
          console.log(
            `   - Repository: http://localhost:${this.PORT}/test/repository/categories`
          );
        }
      });
    } catch (error) {
      console.error("❌ [ProductService] 서버 시작 실패:", error);
      process.exit(1);
    }
  }

  /**
   * 서버 종료 처리
   */
  setupGracefulShutdown(): void {
    process.on("SIGTERM", async () => {
      console.log("🔄 [ProductService] SIGTERM 수신, 서버 종료 중...");
      await this.shutdown();
    });

    process.on("SIGINT", async () => {
      console.log("🔄 [ProductService] SIGINT 수신, 서버 종료 중...");
      await this.shutdown();
    });
  }

  /**
   * 서버 종료
   */
  private async shutdown(): Promise<void> {
    try {
      console.log("🔄 [ProductService] 데이터베이스 연결 종료 중...");
      await DatabaseConfig.disconnect();

      console.log("✅ [ProductService] 서버가 정상적으로 종료되었습니다.");
      process.exit(0);
    } catch (error) {
      console.error("❌ [ProductService] 서버 종료 중 오류:", error);
      process.exit(1);
    }
  }
}

// ========================================
// 애플리케이션 시작
// ========================================

async function bootstrap() {
  const app = new ProductServiceApp();

  // Graceful shutdown 설정
  app.setupGracefulShutdown();

  // 서버 시작
  await app.start();
}

// 미처리 예외 처리
process.on("uncaughtException", (error) => {
  console.error("❌ [ProductService] Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "❌ [ProductService] Unhandled Rejection at:",
    promise,
    "reason:",
    reason
  );
  process.exit(1);
});

// 애플리케이션 실행
bootstrap().catch((error) => {
  console.error("❌ [ProductService] Bootstrap 실패:", error);
  process.exit(1);
});
