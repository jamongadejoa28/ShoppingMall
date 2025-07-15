// ========================================
// Get User Stats Use Case - Admin 전용 사용자 통계 조회
// src/usecases/GetUserStatsUseCase.ts
// ========================================

import { 
  UseCase, 
  Result, 
  UserRepository, 
  GetUserStatsRequest, 
  GetUserStatsResponse 
} from './types';

/**
 * GetUserStatsUseCase - 관리자 전용 사용자 통계 조회 유스케이스
 * 
 * 역할:
 * - 관리자 대시보드용 사용자 통계 정보 제공
 * - 실시간 사용자 현황 분석 데이터 계산
 * - 성장 지표 및 활동 지표 제공
 * 
 * 특징:
 * - 캐싱 가능한 구조로 설계
 * - 다양한 시간 범위별 통계 제공
 * - 역할별 사용자 분포 분석
 */
export class GetUserStatsUseCase implements UseCase<GetUserStatsRequest, GetUserStatsResponse> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(request: GetUserStatsRequest): Promise<Result<GetUserStatsResponse>> {
    try {
      console.log('[GetUserStatsUseCase] 사용자 통계 조회 시작');

      // Repository를 통해 통계 데이터 조회
      const stats = await this.userRepository.getStatistics();

      console.log('[GetUserStatsUseCase] 통계 데이터 조회 완료:', {
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
        newUsersToday: stats.newUsersToday
      });

      const response: GetUserStatsResponse = {
        totalUsers: stats.totalUsers,
        activeUsers: stats.activeUsers,
        newUsersToday: stats.newUsersToday,
        newUsersThisWeek: stats.newUsersThisWeek,
        newUsersThisMonth: stats.newUsersThisMonth,
        adminUsers: stats.adminUsers,
        customerUsers: stats.customerUsers,
        deactivatedUsers: stats.deactivatedUsers,
        lastActivityCounts: {
          today: stats.lastActivityCounts.today,
          thisWeek: stats.lastActivityCounts.thisWeek,
          thisMonth: stats.lastActivityCounts.thisMonth
        }
      };

      return {
        success: true,
        data: response
      };

    } catch (error) {
      console.error('[GetUserStatsUseCase] 사용자 통계 조회 실패:', error);
      
      return {
        success: false,
        error: error instanceof Error 
          ? error.message 
          : '사용자 통계를 조회하는 중 오류가 발생했습니다'
      };
    }
  }
}