import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../middleware/envelope';
import { AppError } from '../services/userService';
import { submitFeedback, dismissFeedback, getAggregatedReports } from '../services/feedbackService';

const router = Router();

/**
 * POST /api/v1/feedback
 * Submit or dismiss feedback for an advisory session.
 * Requires authentication (req.farmerId).
 * Body: { sessionId: string, rating?: number, dismiss?: boolean }
 *
 * Validates: Requirements 9.1, 9.3, 9.5
 */
router.post('/feedback', async (req: Request, res: Response) => {
  if (!req.farmerId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  const { sessionId, rating, dismiss } = req.body as {
    sessionId?: string;
    rating?: number;
    dismiss?: boolean;
  };

  if (!sessionId || typeof sessionId !== 'string') {
    sendError(res, 400, 'VALIDATION_ERROR', 'sessionId is required', 'sessionId');
    return;
  }

  try {
    if (dismiss === true) {
      await dismissFeedback(sessionId);
    } else if (rating !== undefined) {
      await submitFeedback(sessionId, rating);
    } else {
      sendError(res, 400, 'VALIDATION_ERROR', 'Either rating or dismiss must be provided');
      return;
    }

    sendSuccess(res, { ok: true });
  } catch (err) {
    if (err instanceof AppError && err.code === 'VALIDATION_ERROR') {
      sendError(res, 400, err.code, err.message, err.field);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    }
  }
});

/**
 * GET /api/v1/dashboard/reports
 * Returns aggregated usage and feedback reports.
 * Requires authentication and 'officer' or 'admin' role.
 * Role is read from req.query.role as a temporary mechanism (in production it would come from the JWT).
 *
 * Validates: Requirements 9.4, 11.3
 */
router.get('/dashboard/reports', async (req: Request, res: Response) => {
  if (!req.farmerId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  // Temporary role check via query param — in production this comes from the JWT payload
  const role = req.query.role;
  if (role !== 'officer' && role !== 'admin') {
    sendError(res, 403, 'FORBIDDEN', 'Access restricted to officers and administrators');
    return;
  }

  try {
    const report = await getAggregatedReports();
    sendSuccess(res, report);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, 500, err.code, err.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    }
  }
});

export default router;
