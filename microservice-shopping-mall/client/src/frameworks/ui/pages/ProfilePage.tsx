import React from 'react';
import { useAuthStore } from '@frameworks/state/authStore';

const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">프로필</h1>

      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        {user ? (
          <div>
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-600">{user.email}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  계정 정보
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    이름
                  </label>
                  <p className="text-gray-900">{user.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    이메일
                  </label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    역할
                  </label>
                  <p className="text-gray-900">{user.role}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">설정</h3>
                <p className="text-gray-600">
                  프로필 편집 기능은 사용자 서비스와 함께 구현될 예정입니다.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600">로그인이 필요합니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
