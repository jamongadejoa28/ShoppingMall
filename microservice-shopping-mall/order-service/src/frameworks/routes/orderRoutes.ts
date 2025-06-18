import { Router } from "express";
import { OrderController } from "../controllers/OrderController";
import { CreateOrderUseCase } from "../../usecases/CreateOrderUseCase";

// 임시 인증 미들웨어
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: "user-123" };
  next();
};

// 임시 DI 설정. 실제로는 DI 컨테이너가 이 역할을 합니다.
const orderRepository: any = {};
const createOrderUseCase = new CreateOrderUseCase(orderRepository);
const orderController = new OrderController({ createOrderUseCase });

const router = Router();

// TDD 테스트 코드에서 사용하는 라우트 정의
export const orderRoutes = (authMiddleware: any, controller: any) => {
  router.post("/", authMiddleware, controller.createOrder);
  return router;
};

// 실제 사용할 라우터 (임시)
const mainRouter = Router();
mainRouter.post("/", mockAuthMiddleware, orderController.createOrder);

export default mainRouter;
