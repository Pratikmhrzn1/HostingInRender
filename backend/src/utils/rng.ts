import crypto from 'crypto';

/**
 * Cryptographically secure random number generator
 * Used for card dealing and game randomness
 */
export const generateRandomNumber = (min: number, max: number): number => {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValid = Math.floor(256 ** bytesNeeded / range) * range - 1;
  
  let randomValue: number;
  do {
    const randomBytes = crypto.randomBytes(bytesNeeded);
    randomValue = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      randomValue = randomValue * 256 + randomBytes[i];
    }
  } while (randomValue > maxValid);
  
  return min + (randomValue % range);
};

/**
 * Shuffle array using Fisher-Yates algorithm with crypto RNG
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = generateRandomNumber(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Generate OTP
 */
export const generateOTP = (length: number = 6): string => {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return generateRandomNumber(min, max).toString();
};

