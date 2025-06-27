# ========================================
# Product Service Dockerfile
# product-service/Dockerfile
# ========================================

# 1. Base Image (Node.js 18 Alpine)
FROM node:18-alpine AS base

# 작업 디렉토리 설정
WORKDIR /app

# 필수 시스템 패키지 설치 (TypeScript 빌드용)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# ========================================
# 2. Dependencies Stage
# ========================================
FROM base AS dependencies

# package.json과 package-lock.json 복사
COPY package*.json ./

# 프로덕션 의존성 설치
RUN npm ci --only=production --silent

# ========================================
# 3. Build Stage  
# ========================================
FROM base AS build

# package.json과 package-lock.json 복사
COPY package*.json ./

# 모든 의존성 설치 (dev dependencies 포함)
RUN npm ci --silent

# 소스 코드 복사
COPY . .

# TypeScript 빌드
RUN npm run build

# ========================================
# 4. Production Stage
# ========================================
FROM node:18-alpine AS production

# 메타데이터 라벨
LABEL maintainer="shopping-mall-team"
LABEL service="product-service"
LABEL version="1.0.0"

# 비root 사용자 생성
RUN addgroup -g 1001 -S nodejs && \
    adduser -S productservice -u 1001

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치
RUN apk add --no-cache dumb-init curl

# 프로덕션 의존성 복사
COPY --from=dependencies --chown=productservice:nodejs /app/node_modules ./node_modules

# 빌드된 애플리케이션 복사
COPY --from=build --chown=productservice:nodejs /app/dist ./dist
COPY --from=build --chown=productservice:nodejs /app/package*.json ./

# 로그 디렉토리 생성
RUN mkdir -p /app/logs && chown productservice:nodejs /app/logs

# 포트 노출
EXPOSE 3003

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# 사용자 변경
USER productservice

# 엔트리포인트 설정 (dumb-init으로 PID 1 문제 해결)
ENTRYPOINT ["dumb-init", "--"]

# 애플리케이션 시작
CMD ["node", "dist/server.js"]

# ========================================
# Build Arguments (필요시 사용)
# ========================================
ARG NODE_ENV=production
ARG PORT=3003

ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}