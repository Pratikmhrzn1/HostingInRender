import { Context } from 'koa';
import AppDataSource from '@/config/database';
import { User } from '@/models/User.entity';
import { Wallet } from '@/models/Wallet.entity';
import { successResponse, errorResponse } from '@/utils/response';
import * as authService from './auth.service';
import { redisClient } from '@/config/redis';
import { logger } from '@/utils/logger';
import { CustomContext } from '@/types';

export const register = async (ctx: Context): Promise<void> => {
  try {
    const { email, name, phone, password } = ctx.state.validated;

    const userRepository = AppDataSource.getRepository(User);
    const existingUser = await userRepository.findOne({ where: { email } });

    if (existingUser) {
      // If user is not verified, maybe allow resending OTP?
      // For now adhering to existing logic but adding check
      if (!existingUser.isVerified) {
        // If user exists but not verified, we might want to resend OTP?
        // Current logic says "User already exists".
        // Let's stick to strict register for new users.
      }
      errorResponse(ctx, 'User already exists with this email address', 409);
      return;
    }

    // Check OTP Cool-down
    const { allowed, waitTime } = await authService.canRequestOTP(email);
    if (!allowed) {
      errorResponse(ctx, `Please wait ${waitTime} seconds before requesting a new OTP`, 429);
      return;
    }

    // Hash password
    const hashedPassword = await authService.hashPassword(password);

    // Use transaction for atomic user + wallet creation
    await AppDataSource.manager.transaction(async (transactionalEntityManager) => {
      const user = transactionalEntityManager.create(User, {
        email,
        name,
        phone,
        password: hashedPassword,
        isVerified: false
      });
      await transactionalEntityManager.save(user);

      const wallet = transactionalEntityManager.create(Wallet, { userId: user.id });
      await transactionalEntityManager.save(wallet);
    });

    try {
      await authService.generateAndStoreOTP(email);
      successResponse(ctx, { email, otpSent: true, message: 'OTP sent to your email. Please verify to complete registration.' }, 'Registration initiated. Check your email for OTP.');
    } catch (emailError: any) {
      // User is created but email failed. 
      // ideally we should rollback everything, but transaction is committed above.
      // Since email sending is external, better to commit user first or include email in transaction logic?
      // Email cannot be rolled back.
      // If email fails, user exists but unverified. That is acceptable.
      logger.error(`Failed to send OTP email during registration for ${email}: ${emailError.message}`);
      errorResponse(ctx, 'Registration successful but failed to send OTP. Please try logging in to resend OTP.', 500);
      return;
    }

  } catch (error: any) {
    logger.error(`Registration error: ${error.message}`, { stack: error.stack });
    errorResponse(ctx, error.message || 'Registration failed', 500);
  }
};

export const verifyOTP = async (ctx: Context): Promise<void> => {
  try {
    const { email, otp } = ctx.state.validated;

    const isValid = await authService.verifyOTP(email, otp);

    if (!isValid) {
      errorResponse(ctx, 'Invalid or expired OTP', 400);
      return;
    }

    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      errorResponse(ctx, 'User not found. Please register first.', 404);
      return;
    }

    // Mark user as verified
    user.isVerified = true;
    await userRepository.save(user);

    const token = authService.generateToken(user);
    const refreshToken = authService.generateRefreshToken(user);

    successResponse(ctx, {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
      },
      token,
      refreshToken,
    }, 'Registration completed successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'OTP verification failed', 500);
  }
};

export const login = async (ctx: Context): Promise<void> => {
  try {
    const { email, password } = ctx.state.validated;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      errorResponse(ctx, 'User not found', 404);
      return;
    }

    if (!user.password) {
      errorResponse(ctx, 'Please complete your registration first', 400);
      return;
    }

    // Verify password
    const isPasswordValid = await authService.comparePassword(password, user.password);
    if (!isPasswordValid) {
      errorResponse(ctx, 'Invalid password', 401);
      return;
    }

    // Check if OTP login is enabled
    // Default to 'true' if not specified
    const enableOtpLogin = process.env.ENABLE_OTP_LOGIN !== 'false';

    if (!enableOtpLogin) {
      // Direct login avoiding OTP
      const token = authService.generateToken(user);
      const refreshToken = authService.generateRefreshToken(user);

      successResponse(ctx, {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
        },
        token,
        refreshToken,
      }, 'Login successful');
      return;
    }

    const { allowed, waitTime } = await authService.canRequestOTP(email);
    if (!allowed) {
      errorResponse(ctx, `Please wait ${waitTime} seconds before requesting a new OTP`, 429);
      return;
    }

    await authService.generateAndStoreOTP(email);
    // OTP is sent via email

    successResponse(ctx, { email, otpSent: true }, 'OTP sent successfully');
  } catch (error: any) {
    logger.error(`Login error for ${ctx.state.validated?.email || 'unknown'}: ${error.message}`);
    errorResponse(ctx, error.message || 'Login failed', 500);
  }
};

export const refreshToken = async (ctx: Context): Promise<void> => {
  try {
    const { refreshToken } = ctx.state.validated;

    const decoded = authService.verifyRefreshToken(refreshToken);

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: decoded.userId } });

    if (!user) {
      errorResponse(ctx, 'User not found', 404);
      return;
    }

    const token = authService.generateToken(user);
    const newRefreshToken = authService.generateRefreshToken(user);

    successResponse(ctx, { token, refreshToken: newRefreshToken }, 'Token refreshed');
  } catch (error: any) {
    errorResponse(ctx, 'Invalid refresh token', 401);
  }
};

export const forgotPassword = async (ctx: Context): Promise<void> => {
  try {
    const { email } = ctx.state.validated;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      errorResponse(ctx, 'User not found', 404);
      return;
    }

    const { allowed, waitTime } = await authService.canRequestOTP(email);
    if (!allowed) {
      errorResponse(ctx, `Please wait ${waitTime} seconds before requesting a new OTP`, 429);
      return;
    }

    await authService.generateAndStoreOTP(email);

    successResponse(ctx, { email, otpSent: true }, 'OTP sent successfully for password reset');
  } catch (error: any) {
    logger.error(`Forgot password error: ${error.message}`);
    errorResponse(ctx, error.message || 'Forgot password failed', 500);
  }
};

export const resetPassword = async (ctx: Context): Promise<void> => {
  try {
    const { email, otp, newPassword } = ctx.state.validated;

    const isValid = await authService.verifyOTP(email, otp);

    if (!isValid) {
      errorResponse(ctx, 'Invalid or expired OTP', 400);
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      errorResponse(ctx, 'User not found', 404);
      return;
    }

    const hashedPassword = await authService.hashPassword(newPassword);
    user.password = hashedPassword;
    await userRepository.save(user);

    successResponse(ctx, {}, 'Password reset successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Reset password failed', 500);
  }
};

export const requestChangePassword = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: ctx.user.id } });

    if (!user) {
      errorResponse(ctx, 'User not found', 404);
      return;
    }

    const { allowed, waitTime } = await authService.canRequestOTP(user.email);
    if (!allowed) {
      errorResponse(ctx, `Please wait ${waitTime} seconds before requesting a new OTP`, 429);
      return;
    }

    await authService.generateAndStoreOTP(user.email);

    successResponse(ctx, { otpSent: true }, 'OTP sent successfully for password change');
  } catch (error: any) {
    logger.error(`Request change password error: ${error.message}`);
    errorResponse(ctx, error.message || 'Request change password failed', 500);
  }
};

export const changePassword = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { otp, newPassword } = ctx.state.validated;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: ctx.user.id } });

    if (!user) {
      errorResponse(ctx, 'User not found', 404);
      return;
    }

    const isValid = await authService.verifyOTP(user.email, otp);

    if (!isValid) {
      errorResponse(ctx, 'Invalid or expired OTP', 400);
      return;
    }

    const hashedPassword = await authService.hashPassword(newPassword);
    user.password = hashedPassword;
    await userRepository.save(user);

    successResponse(ctx, {}, 'Password changed successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Change password failed', 500);
  }
};

export const getProfile = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: ctx.user.id },
      relations: ['wallet', 'userDetail'],
    });

    if (!user) {
      errorResponse(ctx, 'User not found', 404);
      return;
    }

    successResponse(ctx, {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isUserDetailVerified: user.isUserDetailVerified,
      status: user.status,
      wallet: user.wallet ? {
        balance: user.wallet.balance,
        bonusBalance: user.wallet.bonusBalance,
      } : null,
    }, 'Profile retrieved successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to get profile', 500);
  }
};

export const updateProfile = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { name, phone } = ctx.state.validated;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: ctx.user.id } });

    if (!user) {
      errorResponse(ctx, 'User not found', 404);
      return;
    }

    // Update only provided fields
    if (name) user.name = name;
    if (phone) user.phone = phone;

    await userRepository.save(user);

    successResponse(ctx, {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar,
    }, 'Profile updated successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to update profile', 500);
  }
};

export const updateAvatar = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { avatar } = ctx.state.validated;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: ctx.user.id } });

    if (!user) {
      errorResponse(ctx, 'User not found', 404);
      return;
    }

    user.avatar = avatar;
    await userRepository.save(user);

    successResponse(ctx, {
      id: user.id,
      avatar: user.avatar,
    }, 'Avatar updated successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to update avatar', 500);
  }
};

export const changePasswordAuth = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    const { currentPassword, newPassword } = ctx.state.validated;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: ctx.user.id },
      select: ['id', 'email', 'password']
    });

    if (!user) {
      errorResponse(ctx, 'User not found', 404);
      return;
    }

    // Verify current password
    const isPasswordValid = await authService.comparePassword(currentPassword, user.password || '');
    if (!isPasswordValid) {
      errorResponse(ctx, 'Current password is incorrect', 401);
      return;
    }

    // Hash new password
    const hashedPassword = await authService.hashPassword(newPassword);
    user.password = hashedPassword;
    await userRepository.save(user);

    // Invalidate all tokens by blacklisting
    const tokenKey = `blacklist:${ctx.user.id}`;
    await redisClient.set(tokenKey, 'true');

    successResponse(ctx, null, 'Password changed successfully. Please login again with new password.');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Failed to change password', 500);
  }
};

export const logout = async (ctx: CustomContext): Promise<void> => {
  try {
    if (!ctx.user) {
      errorResponse(ctx, 'User not authenticated', 401);
      return;
    }

    // Invalidate tokens by blacklisting
    const tokenKey = `blacklist:${ctx.user.id}`;
    const tokenExpiry = 24 * 60 * 60; // 24 hours
    await redisClient.setex(tokenKey, tokenExpiry, 'true');

    successResponse(ctx, null, 'Logged out successfully');
  } catch (error: any) {
    errorResponse(ctx, error.message || 'Logout failed', 500);
  }
};
