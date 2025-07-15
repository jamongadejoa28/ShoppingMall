// ========================================
// UpdateUserProfileUseCase - Use Case 계층
// src/usecases/UpdateUserProfileUseCase.ts
// ========================================

import {
  UserRepository,
  UpdateUserProfileRequest,
  UpdateUserProfileResponse,
  Result,
  UseCase,
  DomainError,
  RepositoryError,
} from './types';
import { UpdateProfileData } from '../entities/User';

/**
 * UpdateUserProfileUseCase - 사용자 프로필 업데이트 Use Case
 *
 * 책임:
 * 1. 입력 데이터 유효성 검증
 * 2. 사용자 조회 및 권한 확인
 * 3. 프로필 업데이트 (Entity 비즈니스 로직 사용)
 * 4. 업데이트된 데이터 저장
 * 5. 적절한 에러 처리
 */
export class UpdateUserProfileUseCase
  implements UseCase<UpdateUserProfileRequest, UpdateUserProfileResponse>
{
  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    request: UpdateUserProfileRequest
  ): Promise<Result<UpdateUserProfileResponse>> {
    try {
      // 1. 입력 데이터 검증
      this.validateRequest(request);

      // 2. 사용자 조회
      const user = await this.findUserById(request.userId);

      // 3. 계정 상태 확인
      this.validateAccountStatus(user);

      // 4. 프로필 데이터 업데이트 (Entity 비즈니스 로직 사용)
      this.updateProfileData(user, request);

      // 5. 업데이트된 사용자 저장
      const updatedUser = await this.saveUpdatedUser(user);

      // 6. 성공 응답 생성 (TypeScript 5.8.3 exactOptionalPropertyTypes 호환)
      const userData: UpdateUserProfileResponse['user'] = {
        id: updatedUser.id!,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        updatedAt: updatedUser.updatedAt,
      };

      // 조건부 프로퍼티 할당 (undefined가 아닌 경우에만)

      const responseData: UpdateUserProfileResponse = {
        user: userData,
      };

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * 요청 데이터 검증
   */
  private validateRequest(request: UpdateUserProfileRequest): void {
    if (!request.userId || request.userId.trim().length === 0) {
      throw new DomainError(
        '사용자 ID는 필수 항목입니다',
        'USER_ID_REQUIRED',
        400
      );
    }

    // 최소 하나의 업데이트 필드가 있는지 확인
    if (!request.name && !request.phoneNumber && !request.address) {
      throw new DomainError(
        '업데이트할 정보를 입력해주세요',
        'NO_UPDATE_DATA',
        400
      );
    }

    // 이름 검증 (제공된 경우)
    if (request.name !== undefined) {
      if (
        typeof request.name !== 'string' ||
        request.name.trim().length === 0
      ) {
        throw new DomainError(
          '유효한 이름을 입력해주세요',
          'INVALID_NAME',
          400
        );
      }

      if (request.name.trim().length > 100) {
        throw new DomainError(
          '이름은 100자를 초과할 수 없습니다',
          'NAME_TOO_LONG',
          400
        );
      }
    }

    // 전화번호 검증 (제공된 경우)
    if (request.phoneNumber !== undefined) {
      if (
        typeof request.phoneNumber !== 'string' ||
        request.phoneNumber.trim().length === 0
      ) {
        throw new DomainError(
          '유효한 전화번호를 입력해주세요',
          'INVALID_PHONE',
          400
        );
      }

      // 기본적인 전화번호 형식 검증
      const phoneRegex = /^[0-9-+\s()]+$/;
      if (!phoneRegex.test(request.phoneNumber)) {
        throw new DomainError(
          '올바른 전화번호 형식을 입력해주세요',
          'INVALID_PHONE_FORMAT',
          400
        );
      }
    }

    // 주소 검증 (제공된 경우)
    if (request.address !== undefined) {
      if (typeof request.address !== 'string') {
        throw new DomainError(
          '유효한 주소를 입력해주세요',
          'INVALID_ADDRESS',
          400
        );
      }

      if (request.address.length > 500) {
        throw new DomainError(
          '주소는 500자를 초과할 수 없습니다',
          'ADDRESS_TOO_LONG',
          400
        );
      }
    }
  }

  /**
   * ID로 사용자 조회
   */
  private async findUserById(userId: string) {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new DomainError(
          '사용자를 찾을 수 없습니다',
          'USER_NOT_FOUND',
          404
        );
      }

      return user;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }
      throw new RepositoryError(
        '데이터베이스 오류: 사용자 조회 실패',
        error as Error
      );
    }
  }

  /**
   * 계정 상태 확인
   */
  private validateAccountStatus(user: any): void {
    if (!user.isActive) {
      throw new DomainError(
        '비활성화된 계정은 수정할 수 없습니다',
        'ACCOUNT_DEACTIVATED',
        403
      );
    }
  }

  /**
   * 프로필 데이터 업데이트 (Entity의 비즈니스 로직 사용)
   */
  private updateProfileData(
    user: any,
    request: UpdateUserProfileRequest
  ): void {
    try {
      const updateData: UpdateProfileData = {};

      // 변경된 필드만 업데이트 객체에 포함
      if (request.name !== undefined) {
        updateData.name = request.name.trim();
      }


      // User Entity의 updateProfile 메서드 사용
      user.updateProfile(updateData);
    } catch (error) {
      throw new DomainError((error as Error).message, 'PROFILE_UPDATE_FAILED');
    }
  }

  /**
   * 업데이트된 사용자 저장
   */
  private async saveUpdatedUser(user: any) {
    try {
      return await this.userRepository.update(user);
    } catch (error) {
      throw new RepositoryError('프로필 업데이트 저장 실패', error as Error);
    }
  }

  /**
   * 에러 처리
   */
  private handleError(error: unknown): Result<UpdateUserProfileResponse> {
    if (error instanceof DomainError) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (error instanceof RepositoryError) {
      return {
        success: false,
        error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      };
    }

    // 예상치 못한 에러
    console.error('UpdateUserProfileUseCase 예상치 못한 에러:', error);
    return {
      success: false,
      error: '프로필 업데이트 중 오류가 발생했습니다.',
    };
  }
}
