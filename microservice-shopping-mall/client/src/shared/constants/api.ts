export const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

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
    LIST: '/products',
    DETAIL: (id: string) => `/products/${id}`,
    CATEGORIES: '/products/categories',
    RECOMMENDATIONS: (userId: string) => `/products/recommendations/${userId}`,
  },

  // Order endpoints
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders',
    DETAIL: (id: string) => `/orders/${id}`,
    UPDATE_STATUS: (id: string) => `/orders/${id}/status`,
  },
} as const;
