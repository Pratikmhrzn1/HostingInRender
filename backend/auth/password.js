const { randomBytes, scryptSync, timingSafeEqual } = require('crypto');

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(stored, candidate) {
  if (!stored) return false;
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = scryptSync(candidate, salt, 64);
  const storedBuffer = Buffer.from(key, 'hex');
  if (storedBuffer.length !== derived.length) {
    return false;
  }
  return timingSafeEqual(storedBuffer, derived);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
