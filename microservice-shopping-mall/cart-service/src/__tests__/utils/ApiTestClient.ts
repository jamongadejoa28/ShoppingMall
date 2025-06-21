// ========================================
// API 테스트 클라이언트 (수정됨)
// cart-service/src/__tests__/utils/ApiTestClient.ts
// ========================================

import request from "supertest";
import express from "express";

export class ApiTestClient {
  constructor(private app: express.Application) {}

  // ========================================
  // 장바구니 API 호출 메서드들
  // ========================================

  async addToCart(data: any) {
    return request(this.app)
      .post("/api/v1/carts/items")
      .send(data)
      .expect("Content-Type", /json/);
  }

  async getCart(params: { userId?: string; sessionId?: string }) {
    let query = "";
    if (params.userId) query += `userId=${params.userId}`;
    if (params.sessionId)
      query += `${query ? "&" : ""}sessionId=${params.sessionId}`;

    return request(this.app)
      .get(`/api/v1/carts?${query}`)
      .expect("Content-Type", /json/);
  }

  async updateCartItem(data: any) {
    return request(this.app)
      .put("/api/v1/carts/items")
      .send(data)
      .expect("Content-Type", /json/);
  }

  async removeFromCart(data: any) {
    return request(this.app)
      .delete("/api/v1/carts/items")
      .send(data)
      .expect("Content-Type", /json/);
  }

  async clearCart(data: any) {
    return request(this.app)
      .delete("/api/v1/carts")
      .send(data)
      .expect("Content-Type", /json/);
  }

  async transferCart(data: any) {
    return request(this.app)
      .post("/api/v1/carts/transfer")
      .send(data)
      .expect("Content-Type", /json/);
  }

  // ========================================
  // 헬스체크 API
  // ========================================

  async healthCheck() {
    return request(this.app).get("/health").expect("Content-Type", /json/);
  }

  async getServiceInfo() {
    return request(this.app).get("/api/v1/info").expect("Content-Type", /json/);
  }

  // ========================================
  // 🔧 추가: 일반적인 HTTP 메서드들 (오류 해결용)
  // ========================================

  async get(path: string, headers?: any) {
    let req = request(this.app).get(path);
    if (headers) {
      Object.keys(headers).forEach((key) => {
        req = req.set(key, headers[key]);
      });
    }
    return req;
  }

  async post(path: string, data?: any, headers?: any) {
    let req = request(this.app).post(path);
    if (data) req = req.send(data);
    if (headers) {
      Object.keys(headers).forEach((key) => {
        req = req.set(key, headers[key]);
      });
    }
    return req;
  }

  async put(path: string, data?: any, headers?: any) {
    let req = request(this.app).put(path);
    if (data) req = req.send(data);
    if (headers) {
      Object.keys(headers).forEach((key) => {
        req = req.set(key, headers[key]);
      });
    }
    return req;
  }

  async patch(path: string, data?: any, headers?: any) {
    let req = request(this.app).patch(path);
    if (data) req = req.send(data);
    if (headers) {
      Object.keys(headers).forEach((key) => {
        req = req.set(key, headers[key]);
      });
    }
    return req;
  }

  async delete(path: string, data?: any, headers?: any) {
    let req = request(this.app).delete(path);
    if (data) req = req.send(data);
    if (headers) {
      Object.keys(headers).forEach((key) => {
        req = req.set(key, headers[key]);
      });
    }
    return req;
  }

  async options(path: string, headers?: any) {
    let req = request(this.app).options(path);
    if (headers) {
      Object.keys(headers).forEach((key) => {
        req = req.set(key, headers[key]);
      });
    }
    return req;
  }

  // ========================================
  // 공통 유틸리티 메서드들
  // ========================================

  expectSuccessResponse(response: any, expectedData?: any) {
    expect(response.body).toHaveProperty("success", true);
    expect(response.body).toHaveProperty("message");
    expect(response.body).toHaveProperty("timestamp");

    if (expectedData) {
      expect(response.body.data).toMatchObject(expectedData);
    }
  }

  expectErrorResponse(
    response: any,
    expectedCode?: number,
    expectedMessage?: string
  ) {
    expect(response.body).toHaveProperty("success", false);
    expect(response.body).toHaveProperty("message");

    if (expectedCode) {
      expect(response.status).toBe(expectedCode);
    }

    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }

  // ========================================
  // 🔧 디버깅용: Express App에 대한 제한적 접근
  // ========================================

  /**
   * 테스트 목적으로만 사용 - Express app에 대한 제한적 접근
   * 일반적으로는 위의 메서드들을 사용하는 것을 권장
   */
  getRequestAgent() {
    return request(this.app);
  }
}
