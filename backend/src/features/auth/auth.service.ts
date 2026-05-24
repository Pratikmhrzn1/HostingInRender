import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { redisClient } from '@/config/redis';
import { generateOTP } from '@/utils/rng';
import { User } from '@/models/User.entity';
import { JwtPayload } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);

const OTP_COOLDOWN_SECONDS = 60; // 1 minute cooldown

// Email configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
emailTransporter.verify((err, success) => {
  if (err) {
    console.error("SMTP ERROR:", err);
  } else {
    console.log("SMTP Connected");
  }
});

export const canRequestOTP = async (email: string): Promise<{ allowed: boolean; waitTime?: number }> => {
  const key = `otp:${email}`;
  const ttl = await redisClient.ttl(key);

  // If TTL is -2, key doesn't exist (allowed)
  if (ttl === -2) return { allowed: true };

  // Calculate time elapsed since creation (approximate)
  // Expiry is OTP_EXPIRY_MINUTES * 60
  // If TTL is within the "cool down" window (i.e., user just requested it)
  // We want to block if (OriginalExpiry - currentTTL) < CoolDown
  // Valid logic:
  // If we set ex=300 (5 mins).
  // Immediately TTL=300.
  // We want to force wait 60s.
  // So if (300 - TTL) < 60, block.
  // Wait time = 60 - (300 - TTL)

  const expirySeconds = OTP_EXPIRY_MINUTES * 60;
  const timeElapsed = expirySeconds - ttl;

  if (timeElapsed < OTP_COOLDOWN_SECONDS) {
    return { allowed: false, waitTime: OTP_COOLDOWN_SECONDS - timeElapsed };
  }

  return { allowed: true };
};

export const generateAndStoreOTP = async (email: string): Promise<string> => {
  // Check cool-down first (controller should handle this, but double check here or just proceed assuming controller did)
  // We'll update the key.

  const otp = generateOTP(6);
  const key = `otp:${email}`;
  const expiry = OTP_EXPIRY_MINUTES * 60;

  await redisClient.setex(key, expiry, otp);

  await sendOTPEmail(email, otp); // Send OTP via email

  console.log(`OTP sent to ${email}: ${otp}`); // For development, log OTP
  return otp;
};

export const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
    const key = `otp:${email}`;
    
    console.log('The OTP is:', otp);
    
    const storedOTP = await redisClient.get(key);
    
    if (!storedOTP || storedOTP !== otp) {
        return false;
    }

    await redisClient.del(key);
    return true;
};

export const generateToken = (user: User): string => {
  const payload: JwtPayload = {
    userId: user.id,
    phone: user.phone,
    email: user.email!,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
};

export const generateRefreshToken = (user: User): string => {
  const payload: JwtPayload = {
    userId: user.id,
    phone: user.phone,
    email: user.email!,
    role: user.role,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as SignOptions);
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Email utility functions
export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    await emailTransporter.sendMail({
      from: process.env.FROM_EMAIL,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error; // Re-throw to be caught by controller
  }
};

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Your OTP Code</h2>
      <p>Hello,</p>
      <p>Your One-Time Password (OTP) for verification is:</p>
      <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #007bff; font-size: 32px; margin: 0;">${otp}</h1>
      </div>
      <p>This OTP will expire in ${OTP_EXPIRY_MINUTES} minutes.</p>
      <p>If you didn't request this OTP, please ignore this email.</p>
      <p>Best regards,<br>Game Platform Team</p>
    </div>
  `;

  await sendEmail(email, 'Your OTP Code', html);
};
