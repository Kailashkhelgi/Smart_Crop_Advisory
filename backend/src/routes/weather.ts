import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../middleware/envelope';
import { AppError } from '../services/userService';
import { getWeather } from '../services/weatherService';

const router = Router();

/**
 * GET /api/v1/weather
 * Returns current weather data for the given coordinates.
 * Query params: lat (required, number), lon (required, number)
 */
router.get('/', async (req: Request, res: Response) => {
  const farmerId = req.farmerId;
  if (!farmerId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  const { lat, lon } = req.query;

  if (lat === undefined || lat === '') {
    sendError(res, 400, 'MISSING_PARAM', 'lat query parameter is required', 'lat');
    return;
  }
  if (lon === undefined || lon === '') {
    sendError(res, 400, 'MISSING_PARAM', 'lon query parameter is required', 'lon');
    return;
  }

  const latNum = Number(lat);
  const lonNum = Number(lon);

  if (isNaN(latNum) || isNaN(lonNum)) {
    sendError(res, 400, 'INVALID_PARAM', 'lat and lon must be valid numbers');
    return;
  }

  try {
    const weatherData = await getWeather(latNum, lonNum);
    sendSuccess(res, weatherData);
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'WEATHER_UNAVAILABLE') {
        sendError(res, 503, err.code, err.message);
      } else {
        sendError(res, 500, err.code, err.message);
      }
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    }
  }
});

export default router;
