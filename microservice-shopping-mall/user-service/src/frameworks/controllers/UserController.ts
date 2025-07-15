// ========================================
// User Controller - 사용자 관련 HTTP 요청 처리
// ========================================

import { Request, Response, NextFunction } from 'express';
import { RegisterUserUseCase } from '../../usecases/RegisterUserUseCase';
import { LoginUserUseCase } from '../../usecases/LoginUserUseCase';
import { RefreshTokenUseCase } from '../../usecases/RefreshTokenUseCase';
import { GetUserProfileUseCase } from '../../usecases/GetUserProfileUseCase';
import { UpdateUserProfileUseCase } from '../../usecases/UpdateUserProfileUseCase';
import { DeactivateUserUseCase } from '../../usecases/DeactivateUserUseCase';
import { GetUsersUseCase } from '../../usecases/GetUsersUseCase';
import { GetUserStatsUseCase } from '../../usecases/GetUserStatsUseCase';

export class UserController {
  private readonly registerUserUseCase: RegisterUserUseCase;
  private readonly loginUserUseCase: LoginUserUseCase;
  private readonly refreshTokenUseCase: RefreshTokenUseCase;
  private readonly getUserProfileUseCase: GetUserProfileUseCase;
  private readonly updateUserProfileUseCase: UpdateUserProfileUseCase;
  private readonly deactivateUserUseCase: DeactivateUserUseCase;
  private readonly getUsersUseCase: GetUsersUseCase;
  private readonly getUserStatsUseCase: GetUserStatsUseCase;

  constructor(
    registerUserUseCase: RegisterUserUseCase,
    loginUserUseCase: LoginUserUseCase,
    refreshTokenUseCase: RefreshTokenUseCase,
    getUserProfileUseCase: GetUserProfileUseCase,
    updateUserProfileUseCase: UpdateUserProfileUseCase,
    deactivateUserUseCase: DeactivateUserUseCase,
    getUsersUseCase: GetUsersUseCase,
    getUserStatsUseCase: GetUserStatsUseCase
  ) {
    this.registerUserUseCase = registerUserUseCase;
    this.loginUserUseCase = loginUserUseCase;
    this.refreshTokenUseCase = refreshTokenUseCase;
    this.getUserProfileUseCase = getUserProfileUseCase;
    this.updateUserProfileUseCase = updateUserProfileUseCase;
    this.deactivateUserUseCase = deactivateUserUseCase;
    this.getUsersUseCase = getUsersUseCase;
    this.getUserStatsUseCase = getUserStatsUseCase;
  }

  /**
   * 회원가입
   */
  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.registerUserUseCase.execute(req.body);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: '회원가입이 성공적으로 완료되었습니다.',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '회원가입에 실패했습니다.',
          error: 'REGISTER_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 로그인
   */
  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.loginUserUseCase.execute(req.body);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '로그인이 성공적으로 완료되었습니다.',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '로그인에 실패했습니다.',
          error: 'LOGIN_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 토큰 갱신
   */
  public refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.refreshTokenUseCase.execute(req.body);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '토큰이 성공적으로 갱신되었습니다.',
          data: result.data,
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.error || '토큰 갱신에 실패했습니다.',
          error: 'REFRESH_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 프로필 조회
   */
  public getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.',
          error: 'UNAUTHORIZED',
          data: null,
        });
        return;
      }

      const result = await this.getUserProfileUseCase.execute({ userId });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '프로필 조회가 완료되었습니다.',
          data: result.data,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.error || '사용자를 찾을 수 없습니다.',
          error: 'USER_NOT_FOUND',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 프로필 수정
   */
  public updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.',
          error: 'UNAUTHORIZED',
          data: null,
        });
        return;
      }

      const result = await this.updateUserProfileUseCase.execute({
        userId,
        ...req.body,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '프로필 수정이 완료되었습니다.',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '프로필 수정에 실패했습니다.',
          error: 'UPDATE_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 계정 비활성화
   */
  public deactivateAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: '인증이 필요합니다.',
          error: 'UNAUTHORIZED',
          data: null,
        });
        return;
      }

      const result = await this.deactivateUserUseCase.execute({ userId });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '계정이 비활성화되었습니다.',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '계정 비활성화에 실패했습니다.',
          error: 'DEACTIVATION_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 사용자 목록 조회 (관리자 전용)
   */
  public getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      
      const filters: {
        page: number;
        limit: number;
        search?: string;
        role: 'customer' | 'admin' | 'all';
        isActive?: boolean;
        sortBy: 'name' | 'email' | 'createdAt' | 'lastLoginAt';
        sortOrder: 'asc' | 'desc';
      } = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        role: (req.query.role as 'customer' | 'admin' | 'all') || 'all',
        sortBy: (req.query.sortBy as 'name' | 'email' | 'createdAt' | 'lastLoginAt') || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc',
      };

      // Optional parameters 추가
      if (req.query.search && typeof req.query.search === 'string') {
        filters.search = req.query.search;
      }
      if (req.query.isActive) {
        filters.isActive = req.query.isActive === 'true';
      }

      const result = await this.getUsersUseCase.execute(filters);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '사용자 목록 조회가 완료되었습니다.',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '사용자 목록 조회에 실패했습니다.',
          error: 'GET_USERS_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * 사용자 통계 조회 (관리자 전용)
   */
  public getUserStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.getUserStatsUseCase.execute({});

      if (result.success) {
        res.status(200).json({
          success: true,
          message: '사용자 통계 조회가 완료되었습니다.',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.error || '사용자 통계 조회에 실패했습니다.',
          error: 'GET_STATS_FAILED',
          data: null,
        });
      }
    } catch (error) {
      next(error);
    }
  };
}