// cart-service/src/adapters/RedisCartCacheImpl.ts
// ========================================

import { Cart } from "../entities/Cart";
import { CartCache } from "../usecases/types";
import Redis from "ioredis";

export class RedisCartCacheImpl implements CartCache {
  private redis: Redis;
  private keyPrefix: string;
  private defaultTTL: number;

  constructor(redis: Redis, keyPrefix = "cart:", defaultTTL = 1800) {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
    this.defaultTTL = defaultTTL;
  }

  async setCart(cartId: string, cart: Cart): Promise<void> {
    const key = `${this.keyPrefix}cart:${cartId}`;
    const value = JSON.stringify(cart.toJSON());
    await this.redis.setex(key, this.defaultTTL, value);
  }

  async getCart(cartId: string): Promise<Cart | null> {
    const key = `${this.keyPrefix}cart:${cartId}`;
    const value = await this.redis.get(key);

    if (!value) return null;

    try {
      const data = JSON.parse(value);
      return new Cart(data);
    } catch (error) {
      console.error("Failed to parse cart from cache:", error);
      return null;
    }
  }

  async setUserCartId(userId: string, cartId: string): Promise<void> {
    const key = `${this.keyPrefix}user:${userId}`;
    await this.redis.setex(key, this.defaultTTL * 2, cartId); // 더 긴 TTL
  }

  async getUserCartId(userId: string): Promise<string | null> {
    const key = `${this.keyPrefix}user:${userId}`;
    return await this.redis.get(key);
  }

  async setSessionCartId(sessionId: string, cartId: string): Promise<void> {
    const key = `${this.keyPrefix}session:${sessionId}`;
    await this.redis.setex(key, this.defaultTTL, cartId);
  }

  async getSessionCartId(sessionId: string): Promise<string | null> {
    const key = `${this.keyPrefix}session:${sessionId}`;
    return await this.redis.get(key);
  }

  async deleteCart(cartId: string): Promise<void> {
    const key = `${this.keyPrefix}cart:${cartId}`;
    await this.redis.del(key);
  }

  async deleteUserCart(userId: string): Promise<void> {
    const key = `${this.keyPrefix}user:${userId}`;
    await this.redis.del(key);
  }

  async deleteSessionCart(sessionId: string): Promise<void> {
    const key = `${this.keyPrefix}session:${sessionId}`;
    await this.redis.del(key);
  }
}
