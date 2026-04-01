import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../middleware/envelope';
import { AppError } from '../services/userService';
import {
  createSoilProfile,
  getSoilProfile,
  updateSoilProfile,
  SoilProfileData,
} from '../services/soilProfileService';

const router = Router();

/**
 * POST /api/v1/soil-profiles
 * Creates a new soil profile for the authenticated farmer.
 */
router.post('/', async (req: Request, res: Response) => {
  const farmerId = req.farmerId;
  if (!farmerId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  try {
    const data = req.body as SoilProfileData;
    const profile = await createSoilProfile(farmerId, data);
    sendSuccess(res, profile, 201);
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'VALIDATION_ERROR') {
        sendError(res, 400, err.code, err.message, err.field);
      } else {
        sendError(res, 500, err.code, err.message);
      }
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    }
  }
});

/**
 * GET /api/v1/soil-profiles/:id
 * Retrieves a soil profile by ID, scoped to the authenticated farmer.
 */
router.get('/:id', async (req: Request, res: Response) => {
  const farmerId = req.farmerId;
  if (!farmerId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  try {
    const profile = await getSoilProfile(req.params.id, farmerId);
    sendSuccess(res, profile);
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'NOT_FOUND') {
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
 * PUT /api/v1/soil-profiles/:id
 * Updates an existing soil profile for the authenticated farmer.
 */
router.put('/:id', async (req: Request, res: Response) => {
  const farmerId = req.farmerId;
  if (!farmerId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  try {
    const data = req.body as Partial<SoilProfileData>;
    const profile = await updateSoilProfile(req.params.id, farmerId, data);
    sendSuccess(res, profile);
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'VALIDATION_ERROR') {
        sendError(res, 400, err.code, err.message, err.field);
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
