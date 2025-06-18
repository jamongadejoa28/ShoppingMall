// cart-service/src/infrastructure/database/test-data-source.ts
// ========================================

import { DataSource } from "typeorm";
import { CartEntity } from "../../adapters/entities/CartEntity";
import { CartItemEntity } from "../../adapters/entities/CartItemEntity";
import dotenv from "dotenv";

// 테스트 환경 변수 로드
dotenv.config({ path: ".env.test" });

export const TestDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "rlarkdmf",
  database: "shopping_mall_carts_test", // ✅ 하드코딩으로 명확하게
  synchronize: false,
  logging: false,
  entities: [CartEntity, CartItemEntity],

  // ✅ 테스트 최적화 설정
  extra: {
    max: 5, // 최대 연결 수
    min: 1, // 최소 연결 수
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 3000,
  },
});
