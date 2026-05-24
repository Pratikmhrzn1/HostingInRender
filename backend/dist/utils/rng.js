"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOTP = exports.shuffleArray = exports.generateRandomNumber = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Cryptographically secure random number generator
 * Used for card dealing and game randomness
 */
const generateRandomNumber = (min, max) => {
    const range = max - min + 1;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxValid = Math.floor(256 ** bytesNeeded / range) * range - 1;
    let randomValue;
    do {
        const randomBytes = crypto_1.default.randomBytes(bytesNeeded);
        randomValue = 0;
        for (let i = 0; i < bytesNeeded; i++) {
            randomValue = randomValue * 256 + randomBytes[i];
        }
    } while (randomValue > maxValid);
    return min + (randomValue % range);
};
exports.generateRandomNumber = generateRandomNumber;
/**
 * Shuffle array using Fisher-Yates algorithm with crypto RNG
 */
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = (0, exports.generateRandomNumber)(0, i);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};
exports.shuffleArray = shuffleArray;
/**
 * Generate OTP
 */
const generateOTP = (length = 6) => {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    return (0, exports.generateRandomNumber)(min, max).toString();
};
exports.generateOTP = generateOTP;
