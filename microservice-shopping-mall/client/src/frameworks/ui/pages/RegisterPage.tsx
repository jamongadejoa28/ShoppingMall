// ========================================
// 회원가입 페이지 - User Service API 연동
// client/src/frameworks/ui/pages/RegisterPage.tsx
// ========================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { useAuthStore, type RegisterData } from '../../state/authStore';
import { ROUTES } from '../../../shared/constants/routes';

// ========================================
// 타입 정의
// ========================================

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'customer' | 'admin';
  agreeToTerms: boolean;
}

// ========================================
// 유효성 검증 스키마
// ========================================

const registerSchema = yup.object({
  name: yup
    .string()
    .required('이름을 입력해주세요')
    .min(2, '이름은 최소 2자 이상이어야 합니다')
    .max(100, '이름은 최대 100자까지 입력 가능합니다')
    .matches(/^[가-힣a-zA-Z\s]+$/, '이름은 한글, 영문, 공백만 사용 가능합니다'),
  email: yup
    .string()
    .required('이메일을 입력해주세요')
    .email('올바른 이메일 형식을 입력해주세요')
    .max(255, '이메일은 최대 255자까지 입력 가능합니다'),
  password: yup
    .string()
    .required('비밀번호를 입력해주세요')
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
    .max(128, '비밀번호는 최대 128자까지 입력 가능합니다')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      '비밀번호는 대문자, 소문자, 숫자, 특수문자를 각각 하나 이상 포함해야 합니다'
    ),
  confirmPassword: yup
    .string()
    .required('비밀번호 확인을 입력해주세요')
    .oneOf([yup.ref('password')], '비밀번호가 일치하지 않습니다'),
  role: yup
    .string()
    .oneOf(['customer', 'admin'], '올바른 역할을 선택해주세요')
    .default('customer'),
  agreeToTerms: yup
    .boolean()
    .oneOf([true], '이용약관에 동의해주세요')
    .required(),
});

// ========================================
// RegisterPage 컴포넌트
// ========================================

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'customer',
      agreeToTerms: false,
    },
  });

  // 실시간 비밀번호 확인
  const password = watch('password');

  // ========================================
  // 이벤트 핸들러
  // ========================================

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const registerData: RegisterData = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      };

      const result = await registerUser(registerData);

      if (result.success) {
        toast.success('회원가입이 완료되었습니다!', {
          duration: 4000,
          icon: '🎉',
        });

        // 이메일 인증 안내 메시지
        toast('이메일을 확인하여 계정을 인증해주세요.', {
          duration: 6000,
          icon: '📧',
        });

        // 로그인 페이지로 이동
        navigate(ROUTES.LOGIN);
      } else {
        // 서버에서 반환된 에러 메시지 표시
        if (result.error?.includes('이메일')) {
          setError('email', {
            type: 'server',
            message: result.error,
          });
        } else {
          setError('root', {
            type: 'server',
            message: result.error || '회원가입에 실패했습니다.',
          });
        }
      }
    } catch (error) {
      console.error('회원가입 오류:', error);
      toast.error('회원가입 중 오류가 발생했습니다.', {
        duration: 4000,
        icon: '❌',
      });
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // ========================================
  // 렌더링
  // ========================================

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* 로고 */}
        <Link to={ROUTES.HOME} className="flex justify-center">
          <h1 className="text-3xl font-bold text-blue-600">ShoppingMall</h1>
        </Link>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          회원가입
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          이미 계정이 있으신가요?{' '}
          <Link
            to={ROUTES.LOGIN}
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            로그인하기
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* 이름 입력 */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                이름
              </label>
              <div className="mt-1">
                <input
                  {...register('name')}
                  type="text"
                  autoComplete="name"
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.name
                      ? 'border-red-300 text-red-900 placeholder-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="이름을 입력하세요"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

            {/* 이메일 입력 */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                이메일
              </label>
              <div className="mt-1">
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.email
                      ? 'border-red-300 text-red-900 placeholder-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="이메일을 입력하세요"
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                비밀번호
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10 ${
                    errors.password
                      ? 'border-red-300 text-red-900 placeholder-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="비밀번호를 입력하세요"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
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
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12m-2.122-2.122L7.76 7.76M12 12l2.122 2.122m4.243-4.243L21.24 7.76M12 12l2.122 2.122m0 0l2.121 2.121"
                      />
                    </svg>
                  ) : (
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
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
                {errors.password && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                비밀번호 확인
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10 ${
                    errors.confirmPassword
                      ? 'border-red-300 text-red-900 placeholder-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="비밀번호를 다시 입력하세요"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={toggleConfirmPasswordVisibility}
                >
                  {showConfirmPassword ? (
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
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12m-2.122-2.122L7.76 7.76M12 12l2.122 2.122m4.243-4.243L21.24 7.76M12 12l2.122 2.122m0 0l2.121 2.121"
                      />
                    </svg>
                  ) : (
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
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
                {errors.confirmPassword && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            {/* 역할 선택 */}
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700"
              >
                회원 유형
              </label>
              <div className="mt-1">
                <select
                  {...register('role')}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="customer">일반 회원</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
            </div>

            {/* 이용약관 동의 */}
            <div className="flex items-center">
              <input
                {...register('agreeToTerms')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="agreeToTerms"
                className="ml-2 block text-sm text-gray-900"
              >
                <span>이용약관</span> 및 <span>개인정보처리방침</span>에
                동의합니다
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-sm text-red-600">
                {errors.agreeToTerms.message}
              </p>
            )}

            {/* 전체 에러 메시지 */}
            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{errors.root.message}</p>
              </div>
            )}

            {/* 회원가입 버튼 */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting || isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    회원가입 중...
                  </>
                ) : (
                  '회원가입'
                )}
              </button>
            </div>
          </form>

          {/* 비밀번호 강도 안내 */}
          {password && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                비밀번호 요구사항
              </h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li className={password.length >= 8 ? 'text-green-600' : ''}>
                  • 최소 8자 이상
                </li>
                <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                  • 대문자 포함
                </li>
                <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                  • 소문자 포함
                </li>
                <li className={/\d/.test(password) ? 'text-green-600' : ''}>
                  • 숫자 포함
                </li>
                <li
                  className={/[@$!%*?&]/.test(password) ? 'text-green-600' : ''}
                >
                  • 특수문자 포함
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
