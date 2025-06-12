import { Container } from "inversify";
import { DataSource } from "typeorm";

// Interfaces
import { ProductRepository } from "../../usecases/types";
import { CategoryRepository } from "../../usecases/types";
import { InventoryRepository } from "../../usecases/types";
import { CacheService } from "../../usecases/types";
import { EventPublisher } from "../../usecases/types";

// Implementations
import { ProductRepositoryImpl } from "../../adapters/ProductRepositoryImpl";
import { CategoryRepositoryImpl } from "../../adapters/CategoryRepositoryImpl";
import { InventoryRepositoryImpl } from "../../adapters/InventoryRepositoryImpl";
import { CacheServiceImpl } from "../../adapters/CacheServiceImpl";

// Use Cases
import { CreateProductUseCase } from "../../usecases/CreateProductUseCase";
import { GetProductDetailUseCase } from "../../usecases/GetProductDetailUseCase";
import { GetProductListUseCase } from "../../usecases/GetProductListUseCase";

// Config and Strategy
import { RedisConfig } from "../config/RedisConfig";
import { CacheKeyBuilder } from "../cache/CacheKeyBuilder";
import { CacheStrategyManager } from "../cache/CacheStrategyManager";
import { DatabaseConfig } from "../config/DatabaseConfig";

// 의존성 주입 심볼 정의
export const TYPES = {
  // Repositories
  ProductRepository: Symbol.for("ProductRepository"),
  CategoryRepository: Symbol.for("CategoryRepository"),
  InventoryRepository: Symbol.for("InventoryRepository"),

  // Services
  CacheService: Symbol.for("CacheService"),
  EventPublisher: Symbol.for("EventPublisher"),

  // Use Cases
  CreateProductUseCase: Symbol.for("CreateProductUseCase"),
  GetProductDetailUseCase: Symbol.for("GetProductDetailUseCase"),
  GetProductListUseCase: Symbol.for("GetProductListUseCase"),

  // Infrastructure
  DataSource: Symbol.for("DataSource"),
  RedisConfig: Symbol.for("RedisConfig"),
  CacheKeyBuilder: Symbol.for("CacheKeyBuilder"),
  CacheStrategyManager: Symbol.for("CacheStrategyManager"),
};

/**
 * DI 컨테이너 설정 클래스
 */
export class DIContainer {
  private static instance: Container;

  /**
   * 컨테이너 인스턴스 생성 및 바인딩 설정
   */
  static async create(): Promise<Container> {
    if (!DIContainer.instance) {
      const container = new Container();

      // 1. 설정 바인딩
      await DIContainer.bindConfigurations(container);

      // 2. 인프라스트럭처 바인딩
      await DIContainer.bindInfrastructure(container);

      // 3. 리포지토리 바인딩
      DIContainer.bindRepositories(container);

      // 4. 서비스 바인딩
      DIContainer.bindServices(container);

      // 5. 유스케이스 바인딩
      DIContainer.bindUseCases(container);

      DIContainer.instance = container;
    }

    return DIContainer.instance;
  }

  /**
   * 설정 바인딩
   */
  private static async bindConfigurations(container: Container): Promise<void> {
    // Redis 설정
    const redisConfig = RedisConfig.fromEnvironment();
    container.bind<RedisConfig>(TYPES.RedisConfig).toConstantValue(redisConfig);
  }

  /**
   * 인프라스트럭처 바인딩
   */
  private static async bindInfrastructure(container: Container): Promise<void> {
    // PostgreSQL DataSource
    const dataSource = await DatabaseConfig.createDataSource();
    container.bind<DataSource>(TYPES.DataSource).toConstantValue(dataSource);
  }

  /**
   * 리포지토리 바인딩
   */
  private static bindRepositories(container: Container): void {
    container
      .bind<ProductRepository>(TYPES.ProductRepository)
      .to(ProductRepositoryImpl)
      .inSingletonScope();

    container
      .bind<CategoryRepository>(TYPES.CategoryRepository)
      .to(CategoryRepositoryImpl)
      .inSingletonScope();

    container
      .bind<InventoryRepository>(TYPES.InventoryRepository)
      .to(InventoryRepositoryImpl)
      .inSingletonScope();
  }

  /**
   * 서비스 바인딩
   */
  private static bindServices(container: Container): void {
    // CacheService 바인딩 (RedisConfig를 통해 생성)
    container
      .bind<CacheService>(TYPES.CacheService)
      .toDynamicValue(() => {
        const redisConfig = container.get<RedisConfig>(TYPES.RedisConfig);
        return redisConfig.getCacheService();
      })
      .inSingletonScope();

    // CacheKeyBuilder 바인딩
    container
      .bind<CacheKeyBuilder>(TYPES.CacheKeyBuilder)
      .toDynamicValue(() => {
        const redisConfig = container.get<RedisConfig>(TYPES.RedisConfig);
        return new CacheKeyBuilder(redisConfig);
      })
      .inSingletonScope();

    // CacheStrategyManager 바인딩
    container
      .bind<CacheStrategyManager>(TYPES.CacheStrategyManager)
      .toDynamicValue(() => {
        const redisConfig = container.get<RedisConfig>(TYPES.RedisConfig);
        const cacheService = container.get<CacheService>(
          TYPES.CacheService
        ) as CacheServiceImpl;
        return new CacheStrategyManager(redisConfig, cacheService);
      })
      .inSingletonScope();

    // EventPublisher는 나중에 구현
    // container
    //   .bind<EventPublisher>(TYPES.EventPublisher)
    //   .to(EventPublisherImpl)
    //   .inSingletonScope();
  }

  /**
   * 유스케이스 바인딩
   */
  private static bindUseCases(container: Container): void {
    container
      .bind<CreateProductUseCase>(TYPES.CreateProductUseCase)
      .to(CreateProductUseCase)
      .inTransientScope();

    container
      .bind<GetProductDetailUseCase>(TYPES.GetProductDetailUseCase)
      .to(GetProductDetailUseCase)
      .inTransientScope();

    container
      .bind<GetProductListUseCase>(TYPES.GetProductListUseCase)
      .to(GetProductListUseCase)
      .inTransientScope();
  }

  /**
   * 컨테이너 인스턴스 반환
   */
  static getContainer(): Container {
    if (!DIContainer.instance) {
      throw new Error(
        "DI 컨테이너가 초기화되지 않았습니다. DIContainer.create()를 먼저 호출하세요."
      );
    }
    return DIContainer.instance;
  }

  /**
   * 컨테이너 정리
   */
  static async cleanup(): Promise<void> {
    if (DIContainer.instance) {
      try {
        // Redis 연결 정리
        const redisConfig = DIContainer.instance.get<RedisConfig>(
          TYPES.RedisConfig
        );
        await redisConfig.disconnect();

        // PostgreSQL 연결 정리
        const dataSource = DIContainer.instance.get<DataSource>(
          TYPES.DataSource
        );
        if (dataSource.isInitialized) {
          await dataSource.destroy();
        }

        // 컨테이너 정리
        DIContainer.instance.unbindAll();
        console.log("[DIContainer] 모든 리소스 정리 완료");
      } catch (error) {
        console.error("[DIContainer] 리소스 정리 중 오류:", error);
      }
    }
  }
}
