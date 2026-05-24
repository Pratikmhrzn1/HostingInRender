import Redis from 'ioredis';
import { config } from 'dotenv';

config();

const isRedisEnabled = process.env.REDIS_ENABLED === 'true';

const memoryStore = new Map<string, string>();
const memoryExpiries = new Map<string, ReturnType<typeof setTimeout>>();

class MockRedis {

  private store = memoryStore;
  private expiries = memoryExpiries;

  async connect() { return Promise.resolve(); }
  async disconnect() { return Promise.resolve(); }
  async quit() { return 'OK'; }
  async ping() { return 'PONG'; }

  async set(_key: string, _value: string) {
    this.store.set(_key, _value);
    return 'OK';
  }

  async setex(_key: string, _expiry: number, _value: string) {
    this.store.set(_key, _value);
    if (this.expiries.has(_key)) clearTimeout(this.expiries.get(_key)!);
    const timer = setTimeout(() => {
      this.store.delete(_key);
      this.expiries.delete(_key);
    }, _expiry * 1000);
    this.expiries.set(_key, timer);
    return 'OK';
  }

  async get(_key: string) {
    return this.store.get(_key) ?? null;
  }

  async del(_key: string) {
    const existed = this.store.has(_key);
    this.store.delete(_key);
    if (this.expiries.has(_key)) {
      clearTimeout(this.expiries.get(_key)!);
      this.expiries.delete(_key);
    }
    return existed ? 1 : 0;
  }

  async ttl(_key: string) {
    return this.store.has(_key) ? 300 : -2;
  }

  async exists(..._keys: string[]) {
    return _keys.filter(k => this.store.has(k)).length;
  }

  async expire(_key: string, _seconds: number) {
    if (!this.store.has(_key)) return 0;
    if (this.expiries.has(_key)) clearTimeout(this.expiries.get(_key)!);
    const timer = setTimeout(() => {
      this.store.delete(_key);
      this.expiries.delete(_key);
    }, _seconds * 1000);
    this.expiries.set(_key, timer);
    return 1;
  }

  async hgetall(_key: string) { return {}; }
  async hincrby(_key: string, _field: string, _increment: number) { return 0; }
  async hset(_key: string, _field: string, _value: string) { return 0; }
  async hget(_key: string, _field: string) { return null; }
  async hdel(_key: string, ..._fields: string[]) { return 0; }
  async sadd(_key: string, ..._members: (string | number)[]) { return 0; }
  async srem(_key: string, ..._members: (string | number)[]) { return 0; }
  async smembers(_key: string) { return []; }
  async sismember(_key: string, _member: string | number) { return 0; }
  async keys(_pattern: string) { return []; }
  async lpush(_key: string, ..._values: (string | number)[]) { return 0; }
  async rpush(_key: string, ..._values: (string | number)[]) { return 0; }
  async lpop(_key: string) { return null; }
  async rpop(_key: string) { return null; }
  async lrange(_key: string, _start: number, _stop: number) { return []; }
  async zadd(_key: string, ..._args: (string | number)[]) { return 0; }
  async zrange(_key: string, _start: number, _stop: number) { return []; }
  async zrem(_key: string, ..._members: (string | number)[]) { return 0; }
  async zscore(_key: string, _member: string) { return null; }
}

let redisClient: Redis | MockRedis;

if (isRedisEnabled) {
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    retryStrategy: (times: number) => {
      if (times > 10) {
        console.error('❌ Redis max retry attempts reached');
        return null;
      }
      return Math.min(times * 50, 2000);
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  };

  redisClient = new Redis(redisConfig);

  redisClient.on('connect', () => console.log('✅ Redis connected'));
  redisClient.on('error', (error: Error) => console.error('❌ Redis error:', error));
  redisClient.on('close', () => console.log('⚠️ Redis connection closed'));

} else {
  redisClient = new MockRedis();
  console.log('⚠️ Redis disabled - using MockRedis (no caching)');
}

export { redisClient, isRedisEnabled };
export default redisClient;