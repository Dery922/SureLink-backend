import { createClient } from "redis";
import { AppError } from "./errors.js";

let redisClient;

export function getRedisClient() {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  redisClient = createClient({
    url: redisUrl,
  });

  redisClient.on("error", (error) => {
    console.error("Redis client error:", error);
  });

  return redisClient;
}

export async function connectRedis() {
  const client = getRedisClient();
  if (client.isOpen) return client;

  try {
    await client.connect();
    console.log("✅ Redis connected");
    return client;
  } catch (error) {
    throw new AppError(
      "Failed to connect to Redis",
      500,
      "REDIS_CONNECTION_ERROR",
      error.message,
    );
  }
}

export { redisClient };
