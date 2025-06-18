import { DataSource } from "typeorm";
import { OrderEntity } from "../adapters/entities/OrderEntity";
import { OrderItemEntity } from "../adapters/entities/OrderItemEntity";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5434, // 포트 변경 (docker-compose.yml과 일치)
  username: "postgres", // 사용자 이름 변경
  password: "rlarkdmf", // 비밀번호 변경
  database: "shopping_mall_orders_test", // DB 이름 변경
  entities: [OrderEntity, OrderItemEntity],
  synchronize: true,
});

beforeAll(async () => {
  try {
    await AppDataSource.initialize();
    console.log("Test Data Source has been initialized!");
  } catch (err) {
    console.error("Error during Test Data Source initialization", err);
  }
});

afterAll(async () => {
  try {
    await AppDataSource.destroy();
    console.log("Test Data Source has been closed!");
  } catch (err) {
    console.error("Error during Test Data Source destruction", err);
  }
});
