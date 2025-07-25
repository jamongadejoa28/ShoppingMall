// ========================================
// User Controller - Framework 계층
// src/framework/controllers/UserController.ts
// ========================================

import { Request, Response, NextFunction } from 'express';
import { RegisterUserUseCase } from '../../usecases/RegisterUserUseCase';
import { LoginUserUseCase } from '../../usecases/LoginUserUseCase';
import { GetUserProfileUseCase } from '../../usecases/GetUserProfileUseCase';
import { UpdateUserProfileUseCase } from '../../usecases/UpdateUserProfileUseCase';
import { DeactivateUserUseCase } from '../../usecases/DeactivateUserUseCase';
import {
  RegisterUserRequest,
  LoginUserRequest,
  UpdateUserProfileRequest,
  DomainError,
  RepositoryError,
  ExternalServiceError,
} from '../../usecases/types';

/**
 * UserController - Framework 계층
 *
 * 역할:
 * - HTTP 요청/응답 처리
 * - Use Case 계층과의 인터페이스
 * - 에러 핸들링 및 상태 코드 매핑
 *
 * 특징:
 * - Express 5.1.0 최신 문법 사용
 * - Clean Architecture 원칙 준수
 * - SOLID 원칙 적용
 */
export class UserController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
    private readonly updateUserProfileUseCase: UpdateUserProfileUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase
  ) {}

  /**
   * 회원가입 API
   * POST /api/users/register
   */
  register = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const registerRequest: RegisterUserRequest = {
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        role: req.body.role,
      };

      const result = await this.registerUserUseCase.execute(registerRequest);

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.error || '회원가입에 실패했습니다',
          data: null,
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: '회원가입이 성공적으로 완료되었습니다',
        data: result.data,
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  /**
   * 로그인 API
   * POST /api/users/login
   */
  login = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const loginRequest: LoginUserRequest = {
        email: req.body.email,
        password: req.body.password,
      };

      const result = await this.loginUserUseCase.execute(loginRequest);

      if (!result.success) {
        res.status(401).json({
          success: false,
          message: result.error || '로그인에 실패했습니다',
          data: null,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: '로그인이 성공적으로 완료되었습니다',
        data: result.data,
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  /**
   * 사용자 프로필 조회 API
   * GET /api/users/profile
   */
  getProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // JWT 미들웨어에서 설정된 사용자 ID 사용
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다',
          data: null,
        });
        return;
      }

      const result = await this.getUserProfileUseCase.execute({ userId });

      if (!result.success) {
        const statusCode = result.error?.includes('찾을 수 없습니다')
          ? 404
          : 400;
        res.status(statusCode).json({
          success: false,
          message: result.error || '프로필 조회에 실패했습니다',
          data: null,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: '프로필 조회가 성공적으로 완료되었습니다',
        data: result.data,
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  /**
   * 사용자 프로필 업데이트 API
   * PUT /api/users/profile
   */
  updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다',
          data: null,
        });
        return;
      }

      const updateRequest: UpdateUserProfileRequest = {
        userId,
        name: req.body.name,
        phone: req.body.phone,
        address: req.body.address,
      };

      const result = await this.updateUserProfileUseCase.execute(updateRequest);

      if (!result.success) {
        const statusCode = result.error?.includes('찾을 수 없습니다')
          ? 404
          : 400;
        res.status(statusCode).json({
          success: false,
          message: result.error || '프로필 업데이트에 실패했습니다',
          data: null,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: '프로필 업데이트가 성공적으로 완료되었습니다',
        data: result.data,
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  /**
   * 회원 탈퇴 API
   * DELETE /api/users/profile
   */
  deactivateAccount = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다',
          data: null,
        });
        return;
      }

      const result = await this.deactivateUserUseCase.execute({ userId });

      if (!result.success) {
        const statusCode = result.error?.includes('찾을 수 없습니다')
          ? 404
          : 400;
        res.status(statusCode).json({
          success: false,
          message: result.error || '회원 탈퇴에 실패했습니다',
          data: null,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: '회원 탈퇴가 성공적으로 완료되었습니다',
        data: result.data,
      });
    } catch (error) {
      next(this.handleError(error));
    }
  };

  /**
   * 에러 핸들링 헬퍼 메서드
   * 도메인 에러를 HTTP 상태 코드로 매핑
   */
  private handleError(error: unknown): Error {
    if (error instanceof DomainError) {
      const httpError = new Error(error.message) as any;
      httpError.statusCode = error.statusCode;
      httpError.code = error.code;
      return httpError;
    }

    if (error instanceof RepositoryError) {
      const httpError = new Error('데이터베이스 오류가 발생했습니다') as any;
      httpError.statusCode = 500;
      httpError.originalError = error.originalError;
      return httpError;
    }

    if (error instanceof ExternalServiceError) {
      const httpError = new Error('외부 서비스 오류가 발생했습니다') as any;
      httpError.statusCode = 503;
      httpError.service = error.service;
      httpError.originalError = error.originalError;
      return httpError;
    }

    // 예상치 못한 에러
    const httpError = new Error('내부 서버 오류가 발생했습니다') as any;
    httpError.statusCode = 500;
    httpError.originalError = error;
    return httpError;
  }
}

// ========================================
// Express Request 타입 확장
// ========================================
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'customer' | 'admin';
      };
    }
  }
}
