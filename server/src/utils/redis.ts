import Redis from "ioredis";

const redis = () => {
  return process.env.REDIS_HOST && process.env.REDIS_PORT
    ? new Redis({
        port: Number(process.env.REDIS_PORT),
        host: process.env.REDIS_HOST,
        retryStrategy: (times) => Math.max(times * 100, 3000),
      })
    : new Redis({
        retryStrategy: (times) => Math.max(times * 100, 3000),
      });
};

export default redis;
