"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRedisEnabled = exports.redisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const isRedisEnabled = process.env.REDIS_ENABLED === 'true';
exports.isRedisEnabled = isRedisEnabled;
const memoryStore = new Map();
const memoryExpiries = new Map();
class MockRedis {
    constructor() {
        this.store = memoryStore;
        this.expiries = memoryExpiries;
    }
    async connect() { return Promise.resolve(); }
    async disconnect() { return Promise.resolve(); }
    async quit() { return 'OK'; }
    async ping() { return 'PONG'; }
    async set(_key, _value) {
        this.store.set(_key, _value);
        return 'OK';
    }
    async setex(_key, _expiry, _value) {
        this.store.set(_key, _value);
        if (this.expiries.has(_key))
            clearTimeout(this.expiries.get(_key));
        const timer = setTimeout(() => {
            this.store.delete(_key);
            this.expiries.delete(_key);
        }, _expiry * 1000);
        this.expiries.set(_key, timer);
        return 'OK';
    }
    async get(_key) {
        return this.store.get(_key) ?? null;
    }
    async del(_key) {
        const existed = this.store.has(_key);
        this.store.delete(_key);
        if (this.expiries.has(_key)) {
            clearTimeout(this.expiries.get(_key));
            this.expiries.delete(_key);
        }
        return existed ? 1 : 0;
    }
    async ttl(_key) {
        return this.store.has(_key) ? 300 : -2;
    }
    async exists(..._keys) {
        return _keys.filter(k => this.store.has(k)).length;
    }
    async expire(_key, _seconds) {
        if (!this.store.has(_key))
            return 0;
        if (this.expiries.has(_key))
            clearTimeout(this.expiries.get(_key));
        const timer = setTimeout(() => {
            this.store.delete(_key);
            this.expiries.delete(_key);
        }, _seconds * 1000);
        this.expiries.set(_key, timer);
        return 1;
    }
    async hgetall(_key) { return {}; }
    async hincrby(_key, _field, _increment) { return 0; }
    async hset(_key, _field, _value) { return 0; }
    async hget(_key, _field) { return null; }
    async hdel(_key, ..._fields) { return 0; }
    async sadd(_key, ..._members) { return 0; }
    async srem(_key, ..._members) { return 0; }
    async smembers(_key) { return []; }
    async sismember(_key, _member) { return 0; }
    async keys(_pattern) { return []; }
    async lpush(_key, ..._values) { return 0; }
    async rpush(_key, ..._values) { return 0; }
    async lpop(_key) { return null; }
    async rpop(_key) { return null; }
    async lrange(_key, _start, _stop) { return []; }
    async zadd(_key, ..._args) { return 0; }
    async zrange(_key, _start, _stop) { return []; }
    async zrem(_key, ..._members) { return 0; }
    async zscore(_key, _member) { return null; }
}
let redisClient;
if (isRedisEnabled) {
    const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0', 10),
        retryStrategy: (times) => {
            if (times > 10) {
                console.error('❌ Redis max retry attempts reached');
                return null;
            }
            return Math.min(times * 50, 2000);
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    };
    exports.redisClient = redisClient = new ioredis_1.default(redisConfig);
    redisClient.on('connect', () => console.log('✅ Redis connected'));
    redisClient.on('error', (error) => console.error('❌ Redis error:', error));
    redisClient.on('close', () => console.log('⚠️ Redis connection closed'));
}
else {
    exports.redisClient = redisClient = new MockRedis();
    console.log('⚠️ Redis disabled - using MockRedis (no caching)');
}
exports.default = redisClient;
