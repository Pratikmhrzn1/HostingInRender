import crypto from 'crypto';
import { config } from 'dotenv';

config();

const RSA_PRIVATE_KEY = process.env.RSA_PRIVATE_KEY || '';
const RSA_PUBLIC_KEY = process.env.RSA_PUBLIC_KEY || '';

export const encryptCard = (card: string): string => {
  if (!RSA_PUBLIC_KEY) {
    throw new Error('RSA public key not configured');
  }
  
  const buffer = Buffer.from(card);
  const encrypted = crypto.publicEncrypt(
    {
      key: RSA_PUBLIC_KEY,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer
  );
  
  return encrypted.toString('base64');
};

export const decryptCard = (encryptedCard: string): string => {
  if (!RSA_PRIVATE_KEY) {
    throw new Error('RSA private key not configured');
  }
  
  const buffer = Buffer.from(encryptedCard, 'base64');
  const decrypted = crypto.privateDecrypt(
    {
      key: RSA_PRIVATE_KEY,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    buffer
  );
  
  return decrypted.toString();
};

export const hashSensitiveData = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

