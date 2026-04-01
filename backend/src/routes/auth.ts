import { Router, Request, Response } from 'express';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { sendSuccess, sendError } from '../middleware/envelope';
import { sendOtp, verifyOtp, AppError } from '../services/userService';

const router = Router();

// Redis singleton for refresh/logout operations
let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(config.redisUrl);
  }
  return _redis;
}

/**
 * POST /api/v1/auth/register
 * Body: { mobileNumber: string }
 * Sends an OTP to the given mobile number.
 */
router.post('/register', async (req: Request, res: Response) => {
  const { mobileNumber } = req.body as { mobileNumber?: string };

  if (!mobileNumber) {
    sendError(res, 400, 'VALIDATION_ERROR', 'mobileNumber is required', 'mobileNumber');
    return;
  }

  try {
    await sendOtp(mobileNumber);
    sendSuccess(res, { message: 'OTP sent' });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, 503, err.code, err.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    }
  }
});

/**
 * POST /api/v1/auth/verify-otp
 * Body: { mobileNumber: string, otp: string }
 * Verifies the OTP and returns access + refresh tokens.
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
  const { mobileNumber, otp } = req.body as { mobileNumber?: string; otp?: string };

  if (!mobileNumber || !otp) {
    sendError(res, 400, 'VALIDATION_ERROR', 'mobileNumber and otp are required');
    return;
  }

  try {
    const result = await verifyOtp(mobileNumber, otp);
    sendSuccess(res, result);
  } catch (err) {
    if (err instanceof AppError && err.code === 'INVALID_OTP') {
      sendError(res, 401, err.code, err.message);
    } else if (err instanceof AppError) {
      sendError(res, 400, err.code, err.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    }
  }
});

/**
 * POST /api/v1/auth/refresh
 * Body: { farmerId: string, refreshToken: string }
 * Validates the refresh token from Redis and issues a new access token.
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const { farmerId, refreshToken } = req.body as { farmerId?: string; refreshToken?: string };

  if (!farmerId || !refreshToken) {
    sendError(res, 400, 'VALIDATION_ERROR', 'farmerId and refreshToken are required');
    return;
  }

  try {
    const redis = getRedis();
    const stored = await redis.get(`refresh:${farmerId}`);

    if (!stored || stored !== refreshToken) {
      sendError(res, 401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or has expired');
      return;
    }

    // Issue new access token
    const accessToken = jwt.sign({ sub: farmerId }, config.jwtSecret, { expiresIn: '1h' });

    // Rotate refresh token
    const newRefreshToken = uuidv4();
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    await redis.set(`refresh:${farmerId}`, newRefreshToken, 'EX', thirtyDaysInSeconds);

    sendSuccess(res, { accessToken, refreshToken: newRefreshToken, farmerId });
  } catch (err) {
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
});

/**
 * POST /api/v1/auth/logout  (protected — expects req.farmerId set by auth middleware)
 * Deletes the refresh token from Redis.
 */
router.post('/logout', async (req: Request, res: Response) => {
  // farmerId is expected to be attached by the JWT auth middleware
  const farmerId = (req as Request & { farmerId?: string }).farmerId;

  if (!farmerId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  try {
    const redis = getRedis();
    await redis.del(`refresh:${farmerId}`);
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) {
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
});

export default router;
