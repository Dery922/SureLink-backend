// src/services/redisClient.js
import Redis from "redis";
import dotenv from "dotenv";

dotenv.config();

let redisClient = null;
let isConnected = false;

export async function connectRedis() {
  if (!redisClient) {
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    redisClient.on("error", (err) => {
      console.error("❌ Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis connected");
      isConnected = true;
    });

    await redisClient.connect();
  }
  return redisClient;
}

export function getRedisClient() {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call connectRedis() first.");
  }
  return redisClient;
}

export { redisClient };
