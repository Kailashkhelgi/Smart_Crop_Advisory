import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../middleware/envelope';
import { AppError } from '../services/userService';
import { getPrices } from '../services/marketPriceService';

const router = Router();

/**
 * GET /api/v1/market-prices
 * Returns current market prices for a crop near the authenticated farmer's location.
 * Query params: crop (required)
 */
router.get('/', async (req: Request, res: Response) => {
  const farmerId = req.farmerId;
  if (!farmerId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  const { crop } = req.query;
  if (!crop || typeof crop !== 'string') {
    sendError(res, 400, 'MISSING_PARAM', 'crop query parameter is required');
    return;
  }

  try {
    const prices = await getPrices(farmerId, crop);
    sendSuccess(res, prices);
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'MARKET_UNAVAILABLE') {
        sendError(res, 503, err.code, err.message);
      } else if (err.code === 'NOT_FOUND') {
        sendError(res, 404, err.code, err.message);
      } else {
        sendError(res, 500, err.code, err.message);
      }
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    }
  }
});

export default router;
