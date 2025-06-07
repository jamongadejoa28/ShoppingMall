import { IUserRepository } from '@entities/user/IUserRepository';

export class LogoutUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(): Promise<void> {
    try {
      await this.userRepository.logout();
    } catch (error) {
      // 로그아웃 API 실패해도 로컬 토큰은 제거
      console.error('로그아웃 API 호출 실패:', error);
    } finally {
      // 로컬 스토리지에서 토큰 제거
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }
}
