// src/shared/constants/api.ts
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:3003/api';

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },

  // User endpoints
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
  },

  // Product endpoints
  PRODUCTS: {
    LIST: '/v1/products',
    DETAIL: (id: string) => `/v1/products/${id}`,
    CATEGORIES: '/v1/categories',
    RECOMMENDATIONS: (userId: string) =>
      `/v1/products/recommendations/${userId}`,
  },

  // Order endpoints
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders',
    DETAIL: (id: string) => `/orders/${id}`,
    UPDATE_STATUS: (id: string) => `/orders/${id}/status`,
  },
} as const;
