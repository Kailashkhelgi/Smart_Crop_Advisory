import { Router, Request, Response } from 'express';
import multer from 'multer';
import { sendSuccess, sendError } from '../middleware/envelope';
import { AppError } from '../services/userService';
import { analyzeImage } from '../services/imageService';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB first-pass filter
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(null, false); // reject silently; imageService will throw UNSUPPORTED_MEDIA_TYPE
    }
  },
});

/**
 * POST /api/v1/images/analyze
 * Accepts a multipart/form-data upload with a single `image` field.
 * Forwards the image to the Vision Engine and returns a diagnosis.
 */
router.post('/analyze', upload.single('image'), async (req: Request, res: Response) => {
  if (!req.farmerId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  if (!req.file) {
    sendError(res, 400, 'NO_FILE', 'No image file uploaded');
    return;
  }

  try {
    const result = await analyzeImage(req.file);
    sendSuccess(res, result);
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'UNSUPPORTED_MEDIA_TYPE') {
        sendError(res, 415, err.code, err.message);
      } else if (err.code === 'PAYLOAD_TOO_LARGE') {
        sendError(res, 413, err.code, err.message);
      } else if (err.code === 'VISION_ENGINE_UNAVAILABLE') {
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
