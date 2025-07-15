// ========================================
// Admin Users - 사용자 관리 페이지
// Clean Architecture: Framework Layer
// src/frameworks/ui/pages/Admin/AdminUsers.tsx
// ========================================

import React, { useState } from 'react';

/**
 * AdminUsers - 사용자 관리 페이지
 *
 * 기능:
 * - 사용자 목록 조회 (그리드/리스트 뷰)
 * - 사용자 검색 및 필터링
 * - 사용자 상세 정보 보기
 * - 사용자 상태 관리 (활성/비활성)
 * - 새 사용자 초대
 *
 * 참고: 이미지의 Contacts 페이지 디자인 적용
 */
const AdminUsers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // 검색 처리
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 실제 검색 로직 구현
    console.log('Search users:', searchQuery);
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
          <p className="text-gray-600 mt-1">사용자 계정 관리 및 권한 설정</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* 검색창 */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="사용자 검색"
              className="pl-10 pr-4 py-2 w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </form>

          {/* 뷰 모드 토글 */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
          </div>

          {/* 새 사용자 버튼 */}
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span>New User</span>
          </button>
        </div>
      </div>

      {/* 필터 및 통계 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-sm">
              <span className="text-gray-500">총 사용자:</span>
              <span className="font-semibold ml-2">--</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">활성 사용자:</span>
              <span className="font-semibold ml-2 text-green-600">--</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">비활성 사용자:</span>
              <span className="font-semibold ml-2 text-red-600">--</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select className="text-sm border border-gray-300 rounded-lg px-3 py-2">
              <option>모든 사용자</option>
              <option>활성 사용자</option>
              <option>비활성 사용자</option>
              <option>관리자</option>
            </select>
            <select className="text-sm border border-gray-300 rounded-lg px-3 py-2">
              <option>최신 가입순</option>
              <option>이름순</option>
              <option>이메일순</option>
            </select>
          </div>
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white rounded-lg border border-gray-200">
        {viewMode === 'grid' ? (
          // 그리드 뷰 (이미지와 유사한 카드 레이아웃)
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* 빈 상태 - 실제 데이터 연동 전까지 */}
              {[...Array(8)].map((_, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  {/* 프로필 이미지 */}
                  <div className="relative mb-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    {/* 상태 배지 */}
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">ON</span>
                    </div>
                  </div>

                  {/* 사용자 정보 */}
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      사용자 이름
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">사용자 역할</p>
                    <p className="text-sm text-purple-600 mb-4">회사명/부서</p>
                  </div>

                  {/* 연락처 정보 */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <span>+ 82 000 0000 0</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <span>user@email.com</span>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="mt-4 flex justify-center">
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 빈 상태 표시 */}
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="text-gray-500 text-lg font-medium">
                사용자 데이터 준비 중
              </p>
              <p className="text-gray-400 mt-2">
                사용자 목록이 여기에 표시됩니다
              </p>
            </div>
          </div>
        ) : (
          // 리스트 뷰 (테이블 형태)
          <div>
            {/* 테이블 헤더 */}
            <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
              <div>사용자</div>
              <div>이메일</div>
              <div>역할</div>
              <div>가입일</div>
              <div>상태</div>
              <div>액션</div>
            </div>

            {/* 빈 상태 */}
            <div className="text-center py-12">
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 6h6m-6 4h6m2-6h.01M19 16h.01"
                />
              </svg>
              <p className="text-gray-500">사용자 목록 데이터 준비 중</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
