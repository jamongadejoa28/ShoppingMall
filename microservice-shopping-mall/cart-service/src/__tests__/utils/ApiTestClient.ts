// ========================================
// API 테스트 클라이언트
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
}
