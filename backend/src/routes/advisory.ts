import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../middleware/envelope';
import { AppError } from '../services/userService';
import { getCropRecommendations, getFertilizerGuidance } from '../services/advisoryService';

const router = Router();

/**
 * GET /api/v1/advisory/crops
 * Returns crop recommendations for the authenticated farmer's plot.
 * Query params: plotId (required)
 */
router.get('/crops', async (req: Request, res: Response) => {
  const farmerId = req.farmerId;
  if (!farmerId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  const { plotId } = req.query;
  if (!plotId || typeof plotId !== 'string') {
    sendError(res, 400, 'MISSING_PARAM', 'plotId query parameter is required');
    return;
  }

  try {
    const recommendations = await getCropRecommendations(farmerId, plotId);
    sendSuccess(res, recommendations);
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'INCOMPLETE_SOIL_PROFILE') {
        sendError(res, 400, err.code, err.message);
      } else if (err.code === 'ADVISORY_ENGINE_UNAVAILABLE') {
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

/**
 * GET /api/v1/advisory/fertilizer
 * Returns fertilizer guidance for the authenticated farmer's plot and crop.
 * Query params: plotId (required), cropId (required)
 */
router.get('/fertilizer', async (req: Request, res: Response) => {
  const farmerId = req.farmerId;
  if (!farmerId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  const { plotId, cropId } = req.query;
  if (!plotId || typeof plotId !== 'string') {
    sendError(res, 400, 'MISSING_PARAM', 'plotId query parameter is required');
    return;
  }
  if (!cropId || typeof cropId !== 'string') {
    sendError(res, 400, 'MISSING_PARAM', 'cropId query parameter is required');
    return;
  }

  try {
    const schedule = await getFertilizerGuidance(farmerId, plotId, cropId);
    sendSuccess(res, schedule);
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'NO_SOIL_PROFILE') {
        sendError(res, 400, err.code, err.message);
      } else if (err.code === 'ADVISORY_ENGINE_UNAVAILABLE') {
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
