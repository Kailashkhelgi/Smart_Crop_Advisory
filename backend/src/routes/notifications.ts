import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../middleware/envelope';
import { getNotifications } from '../services/notificationService';

const router = Router();

/**
 * GET /api/v1/notifications
 * Returns all notifications for the authenticated farmer, ordered by most recent first.
 * Requires authentication.
 */
router.get('/', async (req: Request, res: Response) => {
  if (!req.farmerId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  try {
    const notifications = await getNotifications(req.farmerId);
    sendSuccess(res, notifications);
  } catch (err) {
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
});

export default router;
