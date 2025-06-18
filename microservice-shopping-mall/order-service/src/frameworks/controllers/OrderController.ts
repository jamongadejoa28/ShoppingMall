import { Request, Response, NextFunction } from "express";
import { CreateOrderUseCase } from "../../usecases/CreateOrderUseCase";

// 임시 타입. 실제로는 DI 컨테이너에서 유스케이스를 주입받습니다.
interface UseCases {
  createOrderUseCase: CreateOrderUseCase;
}

export class OrderController {
  private useCases: UseCases;

  constructor(useCases: UseCases) {
    this.useCases = useCases;
  }

  // 실제 구현은 비워둡니다. 파일과 클래스 구조만 생성합니다.
  createOrder = async (req: Request, res: Response, next: NextFunction) => {
    // TODO: 구현 필요
    res.status(201).json({ message: "Order created" });
  };
}
