"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.changePasswordAuth = exports.updateAvatar = exports.updateProfile = exports.getProfile = exports.changePassword = exports.requestChangePassword = exports.resetPassword = exports.forgotPassword = exports.refreshToken = exports.login = exports.verifyOTP = exports.register = void 0;
const database_1 = __importDefault(require("@/config/database"));
const User_entity_1 = require("@/models/User.entity");
const Wallet_entity_1 = require("@/models/Wallet.entity");
const response_1 = require("@/utils/response");
const authService = __importStar(require("./auth.service"));
const redis_1 = require("@/config/redis");
const logger_1 = require("@/utils/logger");
const register = async (ctx) => {
    try {
        const { email, name, phone, password } = ctx.state.validated;
        const userRepository = database_1.default.getRepository(User_entity_1.User);
        const existingUser = await userRepository.findOne({ where: { email } });
        if (existingUser) {
            // If user is not verified, maybe allow resending OTP?
            // For now adhering to existing logic but adding check
            if (!existingUser.isVerified) {
                // If user exists but not verified, we might want to resend OTP?
                // Current logic says "User already exists".
                // Let's stick to strict register for new users.
            }
            (0, response_1.errorResponse)(ctx, 'User already exists with this email address', 409);
            return;
        }
        // Check OTP Cool-down
        const { allowed, waitTime } = await authService.canRequestOTP(email);
        if (!allowed) {
            (0, response_1.errorResponse)(ctx, `Please wait ${waitTime} seconds before requesting a new OTP`, 429);
            return;
        }
        // Hash password
        const hashedPassword = await authService.hashPassword(password);
        // Use transaction for atomic user + wallet creation
        await database_1.default.manager.transaction(async (transactionalEntityManager) => {
            const user = transactionalEntityManager.create(User_entity_1.User, {
                email,
                name,
                phone,
                password: hashedPassword,
                isVerified: false
            });
            await transactionalEntityManager.save(user);
            const wallet = transactionalEntityManager.create(Wallet_entity_1.Wallet, { userId: user.id });
            await transactionalEntityManager.save(wallet);
        });
        try {
            await authService.generateAndStoreOTP(email);
            (0, response_1.successResponse)(ctx, { email, otpSent: true, message: 'OTP sent to your email. Please verify to complete registration.' }, 'Registration initiated. Check your email for OTP.');
        }
        catch (emailError) {
            // User is created but email failed. 
            // ideally we should rollback everything, but transaction is committed above.
            // Since email sending is external, better to commit user first or include email in transaction logic?
            // Email cannot be rolled back.
            // If email fails, user exists but unverified. That is acceptable.
            logger_1.logger.error(`Failed to send OTP email during registration for ${email}: ${emailError.message}`);
            (0, response_1.errorResponse)(ctx, 'Registration successful but failed to send OTP. Please try logging in to resend OTP.', 500);
            return;
        }
    }
    catch (error) {
        logger_1.logger.error(`Registration error: ${error.message}`, { stack: error.stack });
        (0, response_1.errorResponse)(ctx, error.message || 'Registration failed', 500);
    }
};
exports.register = register;
const verifyOTP = async (ctx) => {
    try {
        const { email, otp } = ctx.state.validated;
        const isValid = await authService.verifyOTP(email, otp);
        if (!isValid) {
            (0, response_1.errorResponse)(ctx, 'Invalid or expired OTP', 400);
            return;
        }
        const userRepository = database_1.default.getRepository(User_entity_1.User);
        const user = await userRepository.findOne({ where: { email } });
        if (!user) {
            (0, response_1.errorResponse)(ctx, 'User not found. Please register first.', 404);
            return;
        }
        // Mark user as verified
        user.isVerified = true;
        await userRepository.save(user);
        const token = authService.generateToken(user);
        const refreshToken = authService.generateRefreshToken(user);
        (0, response_1.successResponse)(ctx, {
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                email: user.email,
            },
            token,
            refreshToken,
        }, 'Registration completed successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'OTP verification failed', 500);
    }
};
exports.verifyOTP = verifyOTP;
const login = async (ctx) => {
    try {
        const { email, password } = ctx.state.validated;
        const userRepository = database_1.default.getRepository(User_entity_1.User);
        const user = await userRepository.findOne({ where: { email } });
        if (!user) {
            (0, response_1.errorResponse)(ctx, 'User not found', 404);
            return;
        }
        if (!user.password) {
            (0, response_1.errorResponse)(ctx, 'Please complete your registration first', 400);
            return;
        }
        // Verify password
        const isPasswordValid = await authService.comparePassword(password, user.password);
        if (!isPasswordValid) {
            (0, response_1.errorResponse)(ctx, 'Invalid password', 401);
            return;
        }
        // Check if OTP login is enabled
        // Default to 'true' if not specified
        const enableOtpLogin = process.env.ENABLE_OTP_LOGIN !== 'false';
        if (!enableOtpLogin) {
            // Direct login avoiding OTP
            const token = authService.generateToken(user);
            const refreshToken = authService.generateRefreshToken(user);
            (0, response_1.successResponse)(ctx, {
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
            (0, response_1.errorResponse)(ctx, `Please wait ${waitTime} seconds before requesting a new OTP`, 429);
            return;
        }
        await authService.generateAndStoreOTP(email);
        // OTP is sent via email
        (0, response_1.successResponse)(ctx, { email, otpSent: true }, 'OTP sent successfully');
    }
    catch (error) {
        logger_1.logger.error(`Login error for ${ctx.state.validated?.email || 'unknown'}: ${error.message}`);
        (0, response_1.errorResponse)(ctx, error.message || 'Login failed', 500);
    }
};
exports.login = login;
const refreshToken = async (ctx) => {
    try {
        const { refreshToken } = ctx.state.validated;
        const decoded = authService.verifyRefreshToken(refreshToken);
        const userRepository = database_1.default.getRepository(User_entity_1.User);
        const user = await userRepository.findOne({ where: { id: decoded.userId } });
        if (!user) {
            (0, response_1.errorResponse)(ctx, 'User not found', 404);
            return;
        }
        const token = authService.generateToken(user);
        const newRefreshToken = authService.generateRefreshToken(user);
        (0, response_1.successResponse)(ctx, { token, refreshToken: newRefreshToken }, 'Token refreshed');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, 'Invalid refresh token', 401);
    }
};
exports.refreshToken = refreshToken;
const forgotPassword = async (ctx) => {
    try {
        const { email } = ctx.state.validated;
        const userRepository = database_1.default.getRepository(User_entity_1.User);
        const user = await userRepository.findOne({ where: { email } });
        if (!user) {
            (0, response_1.errorResponse)(ctx, 'User not found', 404);
            return;
        }
        const { allowed, waitTime } = await authService.canRequestOTP(email);
        if (!allowed) {
            (0, response_1.errorResponse)(ctx, `Please wait ${waitTime} seconds before requesting a new OTP`, 429);
            return;
        }
        await authService.generateAndStoreOTP(email);
        (0, response_1.successResponse)(ctx, { email, otpSent: true }, 'OTP sent successfully for password reset');
    }
    catch (error) {
        logger_1.logger.error(`Forgot password error: ${error.message}`);
        (0, response_1.errorResponse)(ctx, error.message || 'Forgot password failed', 500);
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (ctx) => {
    try {
        const { email, otp, newPassword } = ctx.state.validated;
        const isValid = await authService.verifyOTP(email, otp);
        if (!isValid) {
            (0, response_1.errorResponse)(ctx, 'Invalid or expired OTP', 400);
            return;
        }
        const userRepository = database_1.default.getRepository(User_entity_1.User);
        const user = await userRepository.findOne({ where: { email } });
        if (!user) {
            (0, response_1.errorResponse)(ctx, 'User not found', 404);
            return;
        }
        const hashedPassword = await authService.hashPassword(newPassword);
        user.password = hashedPassword;
        await userRepository.save(user);
        (0, response_1.successResponse)(ctx, {}, 'Password reset successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Reset password failed', 500);
    }
};
exports.resetPassword = resetPassword;
const requestChangePassword = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const userRepository = database_1.default.getRepository(User_entity_1.User);
        const user = await userRepository.findOne({ where: { id: ctx.user.id } });
        if (!user) {
            (0, response_1.errorResponse)(ctx, 'User not found', 404);
            return;
        }
        const { allowed, waitTime } = await authService.canRequestOTP(user.email);
        if (!allowed) {
            (0, response_1.errorResponse)(ctx, `Please wait ${waitTime} seconds before requesting a new OTP`, 429);
            return;
        }
        await authService.generateAndStoreOTP(user.email);
        (0, response_1.successResponse)(ctx, { otpSent: true }, 'OTP sent successfully for password change');
    }
    catch (error) {
        logger_1.logger.error(`Request change password error: ${error.message}`);
        (0, response_1.errorResponse)(ctx, error.message || 'Request change password failed', 500);
    }
};
exports.requestChangePassword = requestChangePassword;
const changePassword = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { otp, newPassword } = ctx.state.validated;
        const userRepository = database_1.default.getRepository(User_entity_1.User);
        const user = await userRepository.findOne({ where: { id: ctx.user.id } });
        if (!user) {
            (0, response_1.errorResponse)(ctx, 'User not found', 404);
            return;
        }
        const isValid = await authService.verifyOTP(user.email, otp);
        if (!isValid) {
            (0, response_1.errorResponse)(ctx, 'Invalid or expired OTP', 400);
            return;
        }
        const hashedPassword = await authService.hashPassword(newPassword);
        user.password = hashedPassword;
        await userRepository.save(user);
        (0, response_1.successResponse)(ctx, {}, 'Password changed successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Change password failed', 500);
    }
};
exports.changePassword = changePassword;
const getProfile = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const userRepository = database_1.default.getRepository(User_entity_1.User);
        const user = await userRepository.findOne({
            where: { id: ctx.user.id },
            relations: ['wallet', 'userDetail'],
        });
        if (!user) {
            (0, response_1.errorResponse)(ctx, 'User not found', 404);
            return;
        }
        (0, response_1.successResponse)(ctx, {
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
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to get profile', 500);
    }
};
exports.getProfile = getProfile;
const updateProfile = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { name, phone } = ctx.state.validated;
        const userRepository = database_1.default.getRepository(User_entity_1.User);
        const user = await userRepository.findOne({ where: { id: ctx.user.id } });
        if (!user) {
            (0, response_1.errorResponse)(ctx, 'User not found', 404);
            return;
        }
        // Update only provided fields
        if (name)
            user.name = name;
        if (phone)
            user.phone = phone;
        await userRepository.save(user);
        (0, response_1.successResponse)(ctx, {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            avatar: user.avatar,
        }, 'Profile updated successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to update profile', 500);
    }
};
exports.updateProfile = updateProfile;
const updateAvatar = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { avatar } = ctx.state.validated;
        const userRepository = database_1.default.getRepository(User_entity_1.User);
        const user = await userRepository.findOne({ where: { id: ctx.user.id } });
        if (!user) {
            (0, response_1.errorResponse)(ctx, 'User not found', 404);
            return;
        }
        user.avatar = avatar;
        await userRepository.save(user);
        (0, response_1.successResponse)(ctx, {
            id: user.id,
            avatar: user.avatar,
        }, 'Avatar updated successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to update avatar', 500);
    }
};
exports.updateAvatar = updateAvatar;
const changePasswordAuth = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        const { currentPassword, newPassword } = ctx.state.validated;
        const userRepository = database_1.default.getRepository(User_entity_1.User);
        const user = await userRepository.findOne({
            where: { id: ctx.user.id },
            select: ['id', 'email', 'password']
        });
        if (!user) {
            (0, response_1.errorResponse)(ctx, 'User not found', 404);
            return;
        }
        // Verify current password
        const isPasswordValid = await authService.comparePassword(currentPassword, user.password || '');
        if (!isPasswordValid) {
            (0, response_1.errorResponse)(ctx, 'Current password is incorrect', 401);
            return;
        }
        // Hash new password
        const hashedPassword = await authService.hashPassword(newPassword);
        user.password = hashedPassword;
        await userRepository.save(user);
        // Invalidate all tokens by blacklisting
        const tokenKey = `blacklist:${ctx.user.id}`;
        await redis_1.redisClient.set(tokenKey, 'true');
        (0, response_1.successResponse)(ctx, null, 'Password changed successfully. Please login again with new password.');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Failed to change password', 500);
    }
};
exports.changePasswordAuth = changePasswordAuth;
const logout = async (ctx) => {
    try {
        if (!ctx.user) {
            (0, response_1.errorResponse)(ctx, 'User not authenticated', 401);
            return;
        }
        // Invalidate tokens by blacklisting
        const tokenKey = `blacklist:${ctx.user.id}`;
        const tokenExpiry = 24 * 60 * 60; // 24 hours
        await redis_1.redisClient.setex(tokenKey, tokenExpiry, 'true');
        (0, response_1.successResponse)(ctx, null, 'Logged out successfully');
    }
    catch (error) {
        (0, response_1.errorResponse)(ctx, error.message || 'Logout failed', 500);
    }
};
exports.logout = logout;
