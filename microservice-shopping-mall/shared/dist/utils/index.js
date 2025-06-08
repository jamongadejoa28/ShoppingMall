"use strict";
// shared/src/utils/index.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvBoolean = exports.getEnvNumber = exports.getEnvVar = exports.maskPhoneNumber = exports.maskEmail = exports.createLogger = exports.shuffleArray = exports.paginate = exports.isValidPhoneNumber = exports.isValidPassword = exports.isValidEmail = exports.formatCurrency = exports.truncate = exports.slugify = exports.addHours = exports.addDays = exports.getCurrentTimestamp = exports.generateOrderId = exports.generateProductId = exports.generateUserId = exports.generateRequestId = exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateTokenPair = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const uuid_1 = require("uuid");
// ========================================
// JWT 토큰 관련 유틸리티
// ========================================
const generateTokenPair = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
    };
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET || "dev-secret", { expiresIn: process.env.JWT_EXPIRES_IN || "15m" });
    const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET || "dev-refresh-secret", { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" });
    return { accessToken, refreshToken };
};
exports.generateTokenPair = generateTokenPair;
const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || "dev-refresh-secret");
};
exports.verifyRefreshToken = verifyRefreshToken;
// ========================================
// 유니크 ID 생성
// ========================================
const generateRequestId = () => {
    return (0, uuid_1.v4)();
};
exports.generateRequestId = generateRequestId;
const generateUserId = () => {
    return `user_${(0, uuid_1.v4)()}`;
};
exports.generateUserId = generateUserId;
const generateProductId = () => {
    return `product_${(0, uuid_1.v4)()}`;
};
exports.generateProductId = generateProductId;
const generateOrderId = () => {
    return `order_${(0, uuid_1.v4)()}`;
};
exports.generateOrderId = generateOrderId;
// ========================================
// 시간 유틸리티
// ========================================
const getCurrentTimestamp = () => {
    return new Date().toISOString();
};
exports.getCurrentTimestamp = getCurrentTimestamp;
const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
exports.addDays = addDays;
const addHours = (date, hours) => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
};
exports.addHours = addHours;
// ========================================
// 문자열 유틸리티
// ========================================
const slugify = (text) => {
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
exports.slugify = slugify;
const truncate = (text, length) => {
    if (text.length <= length)
        return text;
    return text.substring(0, length).trim() + "...";
};
exports.truncate = truncate;
const formatCurrency = (amount, currency = "KRW") => {
    return new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency,
    }).format(amount);
};
exports.formatCurrency = formatCurrency;
// ========================================
// 유효성 검사 유틸리티
// ========================================
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
const isValidPassword = (password) => {
    // 최소 8자, 대문자, 소문자, 숫자 포함
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};
exports.isValidPassword = isValidPassword;
const isValidPhoneNumber = (phone) => {
    const phoneRegex = /^01[0-9]-?\d{3,4}-?\d{4}$/;
    return phoneRegex.test(phone);
};
exports.isValidPhoneNumber = isValidPhoneNumber;
// ========================================
// 배열 유틸리티
// ========================================
const paginate = (items, page, limit) => {
    const offset = (page - 1) * limit;
    const data = items.slice(offset, offset + limit);
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    return { data, total, totalPages };
};
exports.paginate = paginate;
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
exports.shuffleArray = shuffleArray;
const createLogger = (serviceName) => {
    const log = (level, message, meta) => {
        const timestamp = (0, exports.getCurrentTimestamp)();
        const logEntry = {
            timestamp,
            level,
            service: serviceName,
            message,
            ...(meta && { meta }),
        };
        if (process.env.NODE_ENV === "development") {
            console.log(JSON.stringify(logEntry, null, 2));
        }
        else {
            console.log(JSON.stringify(logEntry));
        }
    };
    return {
        info: (message, meta) => log("INFO", message, meta),
        warn: (message, meta) => log("WARN", message, meta),
        error: (message, meta) => log("ERROR", message, meta),
        debug: (message, meta) => {
            if (process.env.NODE_ENV === "development") {
                log("DEBUG", message, meta);
            }
        },
    };
};
exports.createLogger = createLogger;
// ========================================
// 암호화 유틸리티
// ========================================
const maskEmail = (email) => {
    const [username, domain] = email.split("@");
    if (username.length <= 2)
        return email;
    const maskedUsername = username[0] +
        "*".repeat(username.length - 2) +
        username[username.length - 1];
    return `${maskedUsername}@${domain}`;
};
exports.maskEmail = maskEmail;
const maskPhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length !== 11)
        return phone;
    return `${cleaned.substring(0, 3)}-****-${cleaned.substring(7)}`;
};
exports.maskPhoneNumber = maskPhoneNumber;
// ========================================
// 환경 설정 유틸리티
// ========================================
const getEnvVar = (key, defaultValue) => {
    const value = process.env[key];
    if (!value && !defaultValue) {
        throw new Error(`환경 변수 ${key}가 설정되지 않았습니다.`);
    }
    return value || defaultValue;
};
exports.getEnvVar = getEnvVar;
const getEnvNumber = (key, defaultValue) => {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`환경 변수 ${key}가 설정되지 않았습니다.`);
    }
    return value ? parseInt(value, 10) : defaultValue;
};
exports.getEnvNumber = getEnvNumber;
const getEnvBoolean = (key, defaultValue) => {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`환경 변수 ${key}가 설정되지 않았습니다.`);
    }
    return value ? value.toLowerCase() === "true" : defaultValue;
};
exports.getEnvBoolean = getEnvBoolean;
//# sourceMappingURL=index.js.map