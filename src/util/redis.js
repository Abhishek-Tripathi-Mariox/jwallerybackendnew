const redis = require("redis");
require("dotenv").config();

const url = process.env.REDIS_URL;

// In-memory fallback store when Redis is unavailable
const memoryStore = new Map();
let redisAvailable = false;

let client;
try {
  client = redis.createClient({ url: url });

  client.on("connect", () => {
    console.log("Connected to Redis server");
    redisAvailable = true;
  });

  client.on("error", (err) => {
    console.error("Redis error (using in-memory fallback):", err.message);
    redisAvailable = false;
  });

  (async () => {
    try {
      await client.connect();
    } catch (err) {
      console.error("Redis connect failed (using in-memory fallback):", err.message);
      redisAvailable = false;
    }
  })();
} catch (err) {
  console.error("Redis init failed (using in-memory fallback):", err.message);
  redisAvailable = false;
}

module.exports = () => {
  const SetRedis = async (key, val, expireTime) => {
    console.log("Redis=> SetRedis");
    const newVal = JSON.stringify(val);

    if (redisAvailable && client && client.isOpen) {
      await client.set(key, newVal);
      if (expireTime) {
        await client.expire(key, expireTime);
      }
    } else {
      // In-memory fallback
      memoryStore.set(key, newVal);
      if (expireTime) {
        setTimeout(() => memoryStore.delete(key), expireTime * 1000);
      }
    }

    return "Value set in Redis";
  };

  const GetKeys = async (key) => {
    console.log("Redis=> GetKeys");

    if (redisAvailable && client && client.isOpen) {
      const exists = await client.exists(key);
      return exists ? [key] : [];
    }

    // In-memory fallback
    return memoryStore.has(key) ? [key] : [];
  };

  const GetKeyRedis = async (key) => {
    console.log("Redis=> GetKeyRedis");

    if (redisAvailable && client && client.isOpen) {
      const reply = await client.get(key);
      return reply || false;
    }

    // In-memory fallback
    const val = memoryStore.get(key);
    return val || false;
  };

  const GetRedis = async (keys) => {
    console.log("Redis=> GetRedis");

    if (redisAvailable && client && client.isOpen) {
      const reply = await client.mGet(keys);
      return reply || [];
    }

    // In-memory fallback
    const results = (Array.isArray(keys) ? keys : [keys]).map(
      (k) => memoryStore.get(k) || null
    );
    return results;
  };

  const DelRedis = async (key) => {
    console.log("Redis=> DelRedis");

    if (redisAvailable && client && client.isOpen) {
      await client.del(key);
    } else {
      memoryStore.delete(key);
    }
  };

  return {
    SetRedis,
    GetKeys,
    GetKeyRedis,
    GetRedis,
    DelRedis,
  };
};
