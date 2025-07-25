// api-gateway/src/app.ts

import express, { Response, NextFunction } from 'express';
import axios from 'axios';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

import {
  createLogger,
  ApiResponse,
  HTTP_STATUS,
  getCurrentTimestamp,
} from '@shopping-mall/shared';

import {
  errorHandler,
  notFoundHandler,
  handleProcessExit,
} from '@middleware/errorHandler';

import { authRoutes } from '@routes/auth';

// ========================================
// 앱 초기화
// ========================================
const app = express();
const logger = createLogger('api-gateway');

// ========================================
// 기본 미들웨어 설정
// ========================================

// 보안 헤더 설정
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'deny' },
    xContentTypeOptions: true,
  })
);

// CORS 설정
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Session-ID',
    ],
  })
);

// 요청 압축
app.use(compression());

// 요청 크기 제한
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 요청 로깅 (개발 환경에서만 상세 로그)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('common'));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 프로덕션에서는 더 엄격하게
  message: {
    success: false,
    error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 요청 ID 추가 미들웨어
app.use((req: any, res: Response, next: NextFunction) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ========================================
// 헬스체크 라우트
// ========================================
app.get('/health', (req: any, res: Response) => {
  const healthData = {
    status: 'healthy',
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  const response: ApiResponse = {
    success: true,
    data: healthData,
    message: 'API Gateway is healthy',
    timestamp: getCurrentTimestamp(),
    requestId: req.id,
  };

  res.status(HTTP_STATUS.OK).json(response);
});

app.get('/health/live', (req: any, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      alive: true,
      timestamp: getCurrentTimestamp(),
      pid: process.pid,
    },
    message: 'Service is alive',
    timestamp: getCurrentTimestamp(),
    requestId: req.id,
  };

  res.status(HTTP_STATUS.OK).json(response);
});

app.get('/health/ready', (req: any, res: Response) => {
  // 실제로는 데이터베이스, Redis 등의 연결 상태를 확인
  const checks = {
    memory: process.memoryUsage().heapUsed < 1024 * 1024 * 512, // 512MB 미만
    uptime: process.uptime() > 0,
    environment: !!process.env.NODE_ENV,
  };

  const ready = Object.values(checks).every(Boolean);

  const response: ApiResponse = {
    success: true,
    data: {
      ready,
      checks,
    },
    message: ready ? 'Service is ready' : 'Service is not ready',
    timestamp: getCurrentTimestamp(),
    requestId: req.id,
  };

  res.status(HTTP_STATUS.OK).json(response);
});

// ========================================
// API 라우트 설정
// ========================================
const API_VERSION = '/api/v1';

// 인증 관련 라우트
app.use(`${API_VERSION}/auth`, authRoutes);

// 사용자 라우트 (추후 User Service로 프록시)
app.use(`${API_VERSION}/users`, (req: any, res: Response) => {
  const response: ApiResponse = {
    success: false,
    data: null,
    error: 'User Service는 아직 구현되지 않았습니다',
    timestamp: getCurrentTimestamp(),
    requestId: req.id,
  };
  res.status(HTTP_STATUS.NOT_FOUND).json(response);
});

// 상품 라우트 (Product Service로 프록시)
app.use(`${API_VERSION}/products`, async (req: any, res: Response) => {
  try {
    const productServiceUrl =
      process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003';
    // Use axios directly

    // 요청 헤더 복사
    const headers = { ...req.headers };
    delete headers.host; // host 헤더 제거

    // Product Service로 프록시
    const proxyResponse = await axios({
      method: req.method,
      url: `${productServiceUrl}/api/v1/products${req.url}`,
      data: req.body,
      headers,
      params: req.query,
    });

    res.status(proxyResponse.status).json(proxyResponse.data);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      data: null,
      error:
        error.response?.data?.message ||
        error.message ||
        'Product Service 연결 실패',
      timestamp: getCurrentTimestamp(),
      requestId: req.id,
    };
    res
      .status(error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(response);
  }
});

// 장바구니 라우트 (Cart Service로 프록시)
app.use(`${API_VERSION}/cart`, async (req: any, res: Response) => {
  try {
    const cartServiceUrl =
      process.env.CART_SERVICE_URL || 'http://localhost:3006';
    // Use axios directly

    // 요청 헤더 복사 (인증 정보, 세션 ID 등)
    const headers = { ...req.headers };
    delete headers.host; // host 헤더 제거
    
    // X-Session-ID 헤더가 있으면 전달
    if (req.headers['x-session-id']) {
      headers['x-session-id'] = req.headers['x-session-id'];
    }

    // Cart Service로 프록시
    const proxyResponse = await axios({
      method: req.method,
      url: `${cartServiceUrl}/api/v1/cart${req.url}`,
      data: req.body,
      headers,
      params: req.query,
    });

    // Set-Cookie 헤더 전달 (세션 관리를 위해 필수)
    if (proxyResponse.headers['set-cookie']) {
      // 쿠키의 도메인을 클라이언트 도메인으로 수정
      const modifiedCookies = proxyResponse.headers['set-cookie'].map((cookie: string) => {
        // 기존 도메인 제거하고 클라이언트가 접근할 수 있도록 수정
        return cookie.replace(/Domain=[^;]+;?\s*/i, '');
      });
      res.set('Set-Cookie', modifiedCookies);
    }

    res.status(proxyResponse.status).json(proxyResponse.data);
  } catch (error: any) {
    const response: ApiResponse = {
      success: false,
      data: null,
      error:
        error.response?.data?.message ||
        error.message ||
        'Cart Service 연결 실패',
      timestamp: getCurrentTimestamp(),
      requestId: req.id,
    };
    res
      .status(error.response?.status || HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(response);
  }
});

// 주문 라우트 (추후 Order Service로 프록시)
app.use(`${API_VERSION}/orders`, (req: any, res: Response) => {
  const response: ApiResponse = {
    success: false,
    data: null,
    error: 'Order Service는 아직 구현되지 않았습니다',
    timestamp: getCurrentTimestamp(),
    requestId: req.id,
  };
  res.status(HTTP_STATUS.NOT_FOUND).json(response);
});

// ========================================
// 에러 핸들링 미들웨어
// ========================================
app.use(notFoundHandler);
app.use(errorHandler);

// ========================================
// 프로세스 에러 핸들링
// ========================================
handleProcessExit();

// ========================================
// 로깅
// ========================================
logger.info('API Gateway application initialized', {
  environment: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0',
});

export default app;
