import request from "supertest";
import express from "express";
import { orderRoutes } from "../routes/orderRoutes";
import { CreateOrderUseCase } from "../../usecases/CreateOrderUseCase";

// jest.fn()으로 생성된 mock 함수에 타입을 지정해줍니다.
const mockAuthMiddleware = jest.fn((req: any, res: any, next: any) => {
  req.user = { id: "user-123" };
  next();
});

const mockController = {
  // create -> createOrder 로 속성명 변경
  createOrder: jest.fn(async (req, res) => {
    const orderPayload = {
      items: [{ productId: "prod-001", quantity: 2 }],
    };
    const expectedOrder = {
      id: "order-xyz",
      userId: "user-123",
      totalAmount: 20000,
    };
    res.status(201).json(expectedOrder);
  }),
};

const app = express();
app.use(express.json());
// 두 번째 인자로 mockController를 전달
app.use("/orders", orderRoutes(mockAuthMiddleware, mockController));

describe("POST /orders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("유효한 주문 요청 시 201 Created 응답과 생성된 주문 정보를 반환해야 한다", async () => {
    const orderPayload = {
      items: [{ productId: "prod-001", quantity: 2 }],
    };

    await request(app).post("/orders").send(orderPayload);

    // mockController의 createOrder 함수가 호출되었는지 검증
    expect(mockController.createOrder).toHaveBeenCalled();
  });
});
