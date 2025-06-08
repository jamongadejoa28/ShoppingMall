// shared/src/utils/index.ts

import * as jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { User, TokenPair, JwtPayload } from "../types";

// ========================================
// JWT 토큰 관련 유틸리티
// ========================================
export const generateTokenPair = (user: User): TokenPair => {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(
    token,
    process.env.JWT_SECRET || "dev-secret"
  ) as JwtPayload;
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET || "dev-refresh-secret"
  ) as { userId: string };
};

// ========================================
// 유니크 ID 생성
// ========================================
export const generateRequestId = (): string => {
  return uuidv4();
};

export const generateUserId = (): string => {
  return `user_${uuidv4()}`;
};

export const generateProductId = (): string => {
  return `product_${uuidv4()}`;
};

export const generateOrderId = (): string => {
  return `order_${uuidv4()}`;
};

// ========================================
// 시간 유틸리티
// ========================================
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

// ========================================
// 문자열 유틸리티
// ========================================
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

export const truncate = (text: string, length: number): string => {
  if (text.length <= length) return text;
  return text.substring(0, length).trim() + "...";
};

export const formatCurrency = (amount: number, currency = "KRW"): string => {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
  }).format(amount);
};

// ========================================
// 유효성 검사 유틸리티
// ========================================
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  // 최소 8자, 대문자, 소문자, 숫자 포함
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^01[0-9]-?\d{3,4}-?\d{4}$/;
  return phoneRegex.test(phone);
};

// ========================================
// 배열 유틸리티
// ========================================
export const paginate = <T>(
  items: T[],
  page: number,
  limit: number
): { data: T[]; total: number; totalPages: number } => {
  const offset = (page - 1) * limit;
  const data = items.slice(offset, offset + limit);
  const total = items.length;
  const totalPages = Math.ceil(total / limit);

  return { data, total, totalPages };
};

export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// ========================================
// 로깅 유틸리티
// ========================================
export interface Logger {
  info: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

export const createLogger = (serviceName: string): Logger => {
  const log = (level: string, message: string, meta?: any) => {
    const timestamp = getCurrentTimestamp();
    const logEntry = {
      timestamp,
      level,
      service: serviceName,
      message,
      ...(meta && { meta }),
    };

    if (process.env.NODE_ENV === "development") {
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  };

  return {
    info: (message: string, meta?: any) => log("INFO", message, meta),
    warn: (message: string, meta?: any) => log("WARN", message, meta),
    error: (message: string, meta?: any) => log("ERROR", message, meta),
    debug: (message: string, meta?: any) => {
      if (process.env.NODE_ENV === "development") {
        log("DEBUG", message, meta);
      }
    },
  };
};

// ========================================
// 암호화 유틸리티
// ========================================
export const maskEmail = (email: string): string => {
  const [username, domain] = email.split("@");
  if (username.length <= 2) return email;

  const maskedUsername =
    username[0] +
    "*".repeat(username.length - 2) +
    username[username.length - 1];
  return `${maskedUsername}@${domain}`;
};

export const maskPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length !== 11) return phone;

  return `${cleaned.substring(0, 3)}-****-${cleaned.substring(7)}`;
};

// ========================================
// 환경 설정 유틸리티
// ========================================
export const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`환경 변수 ${key}가 설정되지 않았습니다.`);
  }
  return value || defaultValue!;
};

export const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`환경 변수 ${key}가 설정되지 않았습니다.`);
  }
  return value ? parseInt(value, 10) : defaultValue!;
};

export const getEnvBoolean = (key: string, defaultValue?: boolean): boolean => {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`환경 변수 ${key}가 설정되지 않았습니다.`);
  }
  return value ? value.toLowerCase() === "true" : defaultValue!;
};
