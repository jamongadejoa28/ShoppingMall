"use strict";
// ========================================
// Shared Module Entry Point
// ========================================
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = exports.VERSION = void 0;
// 타입 내보내기
__exportStar(require("./types"), exports);
// 유틸리티 내보내기
__exportStar(require("./utils"), exports);
// ========================================
// 버전 정보
// ========================================
exports.VERSION = '1.0.0';
// ========================================
// 환경별 설정 기본값
// ========================================
exports.DEFAULT_CONFIG = {
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    LOG_LEVEL: 'info',
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX: 100, // requests per window
};
//# sourceMappingURL=index.js.map