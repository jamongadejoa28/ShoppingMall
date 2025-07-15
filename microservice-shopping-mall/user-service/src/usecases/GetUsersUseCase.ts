// ========================================
// Get Users Use Case - Admin 전용 사용자 목록 조회
// src/usecases/GetUsersUseCase.ts
// ========================================

import { 
  UseCase, 
  Result, 
  UserRepository, 
  GetUsersRequest, 
  GetUsersResponse 
} from './types';

/**
 * GetUsersUseCase - 관리자 전용 사용자 목록 조회 유스케이스
 * 
 * 역할:
 * - 관리자가 모든 사용자 목록을 조회할 수 있도록 함
 * - 페이징, 검색, 필터링, 정렬 기능 제공
 * - 사용자 정보를 관리자 목적에 맞게 변환
 * 
 * 특징:
 * - 민감한 정보(비밀번호) 제외
 * - 관리자용 추가 정보 포함 (계정 상태, 등록일 등)
 * - 성능 최적화를 위한 페이징 필수
 */
export class GetUsersUseCase implements UseCase<GetUsersRequest, GetUsersResponse> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(request: GetUsersRequest): Promise<Result<GetUsersResponse>> {
    try {
      // 입력 값 검증 및 기본값 설정
      const {
        page = 1,
        limit = 20,
        search,
        role = 'all',
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = request;

      // 페이지 및 제한 값 검증
      if (page < 1) {
        return {
          success: false,
          error: '페이지 번호는 1 이상이어야 합니다'
        };
      }

      if (limit < 1 || limit > 100) {
        return {
          success: false,
          error: '페이지당 항목 수는 1-100 사이여야 합니다'
        };
      }

      // 정렬 필드 검증
      const validSortFields = ['name', 'email', 'createdAt', 'lastLoginAt'];
      if (!validSortFields.includes(sortBy)) {
        return {
          success: false,
          error: `정렬 기준은 ${validSortFields.join(', ')} 중 하나여야 합니다`
        };
      }

      // 정렬 순서 검증
      if (!['asc', 'desc'].includes(sortOrder)) {
        return {
          success: false,
          error: '정렬 순서는 asc 또는 desc여야 합니다'
        };
      }

      // Repository를 통해 사용자 목록 조회
      const findManyOptions: {
        page?: number;
        limit?: number;
        search?: string;
        role?: 'all' | 'customer' | 'admin';
        isActive?: boolean;
        sortBy?: 'name' | 'email' | 'createdAt' | 'lastLoginAt';
        sortOrder?: 'asc' | 'desc';
      } = {
        page,
        limit,
        role,
        sortBy,
        sortOrder
      };

      if (search) {
        findManyOptions.search = search;
      }
      if (isActive !== undefined) {
        findManyOptions.isActive = isActive;
      }

      const { users, total } = await this.userRepository.findMany(findManyOptions);

      // 페이징 정보 계산
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      // 응답 데이터 변환 (민감한 정보 제외)
      const responseUsers = users.map(user => {
        const response: {
          id: string;
          name: string;
          email: string;
          role: 'customer' | 'admin';
          phoneNumber?: string;
          postalCode?: string;
          address?: string;
          detailAddress?: string;
          isActive: boolean;
          lastLoginAt?: Date;
          deactivatedAt?: Date | null;
          createdAt: Date;
          updatedAt: Date;
        } = {
          id: user.id!,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        };

        // Optional properties 처리
        if (user.phoneNumber) response.phoneNumber = user.phoneNumber;
        if (user.postalCode) response.postalCode = user.postalCode;
        if (user.address) response.address = user.address;
        if (user.detailAddress) response.detailAddress = user.detailAddress;
        if (user.lastLoginAt) response.lastLoginAt = user.lastLoginAt;
        if (user.deactivatedAt !== undefined) response.deactivatedAt = user.deactivatedAt;

        return response;
      });

      const response: GetUsersResponse = {
        users: responseUsers,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: total,
          hasNextPage,
          hasPreviousPage
        }
      };

      return {
        success: true,
        data: response
      };

    } catch (error) {
      console.error('[GetUsersUseCase] 사용자 목록 조회 실패:', error);
      
      return {
        success: false,
        error: error instanceof Error 
          ? error.message 
          : '사용자 목록을 조회하는 중 오류가 발생했습니다'
      };
    }
  }
}