import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { redis } from '../config/redis';
import { otpService } from '../lib/otpService';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../lib/AppError';
import { logger } from '../config/logger';
import type { JwtPayload, User } from '@adearn/shared';

const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

function generateTokens(user: User): { accessToken: string; refreshToken: string } {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: user.id,
    role: user.role,
  };

  const accessTokenOptions: SignOptions = {
    algorithm: 'RS256',
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };

  const accessToken = jwt.sign(payload, env.JWT_PRIVATE_KEY, accessTokenOptions);

  const refreshToken = jwt.sign({ sub: user.id }, env.JWT_PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: '30d',
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async requestOtp(mobile: string): Promise<void> {
    // Auto-create user if first time
    let user = await userRepository.findByMobile(mobile);
    if (!user) {
      // Use mobile as placeholder name — user can set name in profile
      user = await userRepository.create(mobile, `User-${mobile.slice(-4)}`);
      logger.info({ userId: user.id }, 'New user created');
    }

    if (!user.is_active) {
      throw new AppError('Account suspended', 403, 'ACCOUNT_SUSPENDED');
    }

    await otpService.send(mobile);
  },

  async verifyOtp(
    mobile: string,
    otp: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    user: Pick<User, 'id' | 'name' | 'role' | 'kyc_status'>;
  }> {
    const valid = await otpService.verify(mobile, otp);
    if (!valid) {
      throw new AppError('Invalid or expired OTP', 401, 'INVALID_OTP');
    }

    const user = await userRepository.findByMobile(mobile);
    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token in Redis
    await redis.set(
      `refresh:${user.id}:${refreshToken.slice(-20)}`,
      '1',
      'EX',
      REFRESH_TOKEN_TTL,
    );

    await userRepository.updateLastSeen(user.id);

    logger.info({ userId: user.id, role: user.role }, 'User authenticated');

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        kyc_status: user.kyc_status,
      },
    };
  },

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    let payload: { sub: string };
    try {
      payload = jwt.verify(refreshToken, env.JWT_PUBLIC_KEY, {
        algorithms: ['RS256'],
      }) as { sub: string };
    } catch {
      throw AppError.unauthorized('Invalid refresh token');
    }

    // Check token exists in Redis (not revoked)
    const key = `refresh:${payload.sub}:${refreshToken.slice(-20)}`;
    const exists = await redis.exists(key);
    if (!exists) {
      throw AppError.unauthorized('Refresh token revoked');
    }

    const user = await userRepository.findById(payload.sub);
    if (!user || !user.is_active) {
      throw AppError.unauthorized('User not found or suspended');
    }

    const { accessToken } = generateTokens(user);
    return { access_token: accessToken };
  },

  async logout(userId: string, refreshToken: string): Promise<void> {
    const key = `refresh:${userId}:${refreshToken.slice(-20)}`;
    await redis.del(key);
    logger.info({ userId }, 'User logged out');
  },
};
