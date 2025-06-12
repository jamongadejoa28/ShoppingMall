import { DataSource } from "typeorm";
import { ProductEntity } from "../../adapters/entities/ProductEntity";
import { CategoryEntity } from "../../adapters/entities/CategoryEntity";
import { InventoryEntity } from "../../adapters/entities/InventoryEntity";

/**
 * 데이터베이스 설정 클래스
 */
export class DatabaseConfig {
  private static dataSource: DataSource | null = null;

  /**
   * TypeORM DataSource 생성 및 초기화
   */
  static async createDataSource(): Promise<DataSource> {
    if (DatabaseConfig.dataSource) {
      return DatabaseConfig.dataSource;
    }

    const dataSource = new DataSource({
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      username: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "shopping_mall_products",

      // 엔티티 설정
      entities: [ProductEntity, CategoryEntity, InventoryEntity],

      // 개발 환경 설정
      synchronize: process.env.NODE_ENV === "development",
      logging:
        process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],

      // 연결 풀 설정
      extra: {
        max: parseInt(process.env.DB_POOL_SIZE || "10"),
        min: parseInt(process.env.DB_POOL_MIN || "2"),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "30000"),
        connectionTimeoutMillis: parseInt(
          process.env.DB_CONNECTION_TIMEOUT || "5000"
        ),
      },

      // 마이그레이션 설정
      migrations: ["src/infrastructure/database/migrations/*.ts"],
      migrationsRun: false, // 수동 마이그레이션
    });

    try {
      await dataSource.initialize();
      console.log("[DatabaseConfig] PostgreSQL 연결 성공");

      DatabaseConfig.dataSource = dataSource;
      return dataSource;
    } catch (error) {
      console.error("[DatabaseConfig] PostgreSQL 연결 실패:", error);
      throw error;
    }
  }

  /**
   * 데이터베이스 연결 상태 확인
   */
  static isConnected(): boolean {
    return DatabaseConfig.dataSource?.isInitialized || false;
  }

  /**
   * 연결 정리
   */
  static async disconnect(): Promise<void> {
    if (DatabaseConfig.dataSource?.isInitialized) {
      await DatabaseConfig.dataSource.destroy();
      DatabaseConfig.dataSource = null;
      console.log("[DatabaseConfig] PostgreSQL 연결 종료");
    }
  }
}
