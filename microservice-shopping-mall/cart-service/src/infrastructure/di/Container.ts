// ========================================
// DI Container - cart-service
// cart-service/src/infrastructure/di/Container.ts
// ========================================

import { Container } from "inversify";
import { DataSource } from "typeorm";
import "reflect-metadata";

// DI 심볼 import
import { TYPES } from "./types";

// Interfaces from UseCases
import {
  CartRepository,
  ProductServiceClient,
  CacheService,
} from "../../usecases/types";

// Implementations
import { CartRepositoryImpl } from "../../adapters/CartRepositoryImpl";
import { MockProductServiceClient } from "../../adapters/MockProductServiceClient";

// New Redis Architecture
import { RedisConfig } from "../config/RedisConfig";
import { CacheServiceImpl } from "../../adapters/CacheServiceImpl";

// Use Cases
import { AddToCartUseCase } from "../../usecases/AddToCartUseCase";
import { GetCartUseCase } from "../../usecases/GetCartUseCase";
import { RemoveFromCartUseCase } from "../../usecases/RemoveFromCartUseCase";
import { UpdateCartItemUseCase } from "../../usecases/UpdateCartItemUseCase";
import { TransferCartUseCase } from "../../usecases/TransferCartUseCase";
import { ClearCartUseCase } from "../../usecases/ClearCartUseCase";

// Controllers
import { CartController } from "../../frameworks/controllers/CartController";

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

      console.log("🔧 [CartService-DIContainer] 바인딩 시작...");

      // 1. 인프라스트럭처 바인딩
      await DIContainer.bindInfrastructure(container);
      console.log("✅ [CartService-DIContainer] 인프라스트럭처 바인딩 완료");

      // 2. 리포지토리 바인딩
      DIContainer.bindRepositories(container);
      console.log("✅ [CartService-DIContainer] 리포지토리 바인딩 완료");

      // 3. 서비스 바인딩
      DIContainer.bindServices(container);
      console.log("✅ [CartService-DIContainer] 서비스 바인딩 완료");

      // 4. 유스케이스 바인딩
      DIContainer.bindUseCases(container);
      console.log("✅ [CartService-DIContainer] 유스케이스 바인딩 완료");

      // 5. 컨트롤러 바인딩
      DIContainer.bindControllers(container);
      console.log("✅ [CartService-DIContainer] 컨트롤러 바인딩 완료");

      DIContainer.instance = container;
      console.log("🎉 [CartService-DIContainer] 전체 바인딩 완료");
    }

    return DIContainer.instance;
  }

  /**
   * 인프라스트럭처 바인딩
   */
  private static async bindInfrastructure(container: Container): Promise<void> {
    // PostgreSQL DataSource
    const { AppDataSource } = await import("../database/data-source");

    // 데이터베이스 연결이 아직 초기화되지 않았다면 초기화
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("✅ [CartService] PostgreSQL 연결 성공");
    }

    container.bind<DataSource>(TYPES.DataSource).toConstantValue(AppDataSource);

    // Redis Client
    const redisConfig = RedisConfig.fromEnvironment();
    container.bind<RedisConfig>(TYPES.RedisConfig).toConstantValue(redisConfig);
  }

  /**
   * 리포지토리 바인딩
   */
  private static bindRepositories(container: Container): void {
    container
      .bind<CartRepository>(TYPES.CartRepository)
      .to(CartRepositoryImpl)
      .inSingletonScope();
  }

  /**
   * 서비스 바인딩
   */
  private static bindServices(container: Container): void {
    // ✅ Product Service Client 바인딩 (Mock 사용)
    container
      .bind<ProductServiceClient>(TYPES.ProductServiceClient)
      .to(MockProductServiceClient)
      .inSingletonScope();

    // 팩토리 패턴을 사용하여 RedisConfig로부터 CacheService 인스턴스를 가져와 바인딩합니다.
    // 이렇게 하면 CacheService의 생성을 RedisConfig에 위임할 수 있습니다.
    container
      .bind<CacheService>(TYPES.CacheService)
      .toDynamicValue((container) => {
        const redisConfig = container.get<RedisConfig>(TYPES.RedisConfig);
        return redisConfig.getCacheService();
      })
      .inSingletonScope();
  }

  /**
   * 유스케이스 바인딩
   */
  private static bindUseCases(container: Container): void {
    container
      .bind<AddToCartUseCase>(TYPES.AddToCartUseCase)
      .to(AddToCartUseCase)
      .inTransientScope();

    container
      .bind<GetCartUseCase>(TYPES.GetCartUseCase)
      .to(GetCartUseCase)
      .inTransientScope();

    container
      .bind<RemoveFromCartUseCase>(TYPES.RemoveFromCartUseCase)
      .to(RemoveFromCartUseCase)
      .inTransientScope();

    container
      .bind<UpdateCartItemUseCase>(TYPES.UpdateCartItemUseCase)
      .to(UpdateCartItemUseCase)
      .inTransientScope();

    container
      .bind<TransferCartUseCase>(TYPES.TransferCartUseCase)
      .to(TransferCartUseCase)
      .inTransientScope();

    container
      .bind<ClearCartUseCase>(TYPES.ClearCartUseCase)
      .to(ClearCartUseCase)
      .inTransientScope();
  }

  /**
   * 컨트롤러 바인딩
   */
  private static bindControllers(container: Container): void {
    container
      .bind<CartController>(TYPES.CartController)
      .to(CartController)
      .inSingletonScope();
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
        console.log("✅ [CartService-DIContainer] 모든 리소스 정리 완료");
      } catch (error) {
        console.error(
          "❌ [CartService-DIContainer] 리소스 정리 중 오류:",
          error
        );
      }
    }
  }
}
