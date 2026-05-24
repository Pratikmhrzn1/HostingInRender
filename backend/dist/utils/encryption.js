"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashSensitiveData = exports.decryptCard = exports.encryptCard = void 0;
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const RSA_PRIVATE_KEY = process.env.RSA_PRIVATE_KEY || '';
const RSA_PUBLIC_KEY = process.env.RSA_PUBLIC_KEY || '';
const encryptCard = (card) => {
    if (!RSA_PUBLIC_KEY) {
        throw new Error('RSA public key not configured');
    }
    const buffer = Buffer.from(card);
    const encrypted = crypto_1.default.publicEncrypt({
        key: RSA_PUBLIC_KEY,
        padding: crypto_1.default.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
    }, buffer);
    return encrypted.toString('base64');
};
exports.encryptCard = encryptCard;
const decryptCard = (encryptedCard) => {
    if (!RSA_PRIVATE_KEY) {
        throw new Error('RSA private key not configured');
    }
    const buffer = Buffer.from(encryptedCard, 'base64');
    const decrypted = crypto_1.default.privateDecrypt({
        key: RSA_PRIVATE_KEY,
        padding: crypto_1.default.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
    }, buffer);
    return decrypted.toString();
};
exports.decryptCard = decryptCard;
const hashSensitiveData = (data) => {
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
};
exports.hashSensitiveData = hashSensitiveData;
