import React from 'react';
import { useAuthStore } from '../../state/authStore';

const ProfilePage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">프로필</h1>
          <p className="text-gray-600">로그인이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">프로필</h1>
        <p className="text-gray-600">
          {user?.name || '사용자'}님의 프로필 페이지입니다.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          백엔드 API 연동 후 실제 기능이 구현됩니다.
        </p>
      </div>
    </div>
  );
};

export default ProfilePage;
