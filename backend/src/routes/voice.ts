import { Router, Request, Response } from 'express';
import multer from 'multer';
import { sendSuccess, sendError } from '../middleware/envelope';
import { AppError } from '../services/userService';
import { speechToText, textToSpeech } from '../services/voiceService';

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

const SUPPORTED_LANGUAGES = ['en', 'hi', 'pa'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

function isValidLanguage(lang: unknown): lang is SupportedLanguage {
  return typeof lang === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

/**
 * POST /api/v1/voice/stt
 * Converts uploaded audio to text.
 * Requires authentication. Accepts multipart/form-data with field `audio`.
 * Optional query/body param: language ('en' | 'hi' | 'pa', defaults to 'en')
 */
router.post('/stt', upload.single('audio'), async (req: Request, res: Response) => {
  if (!req.farmerId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  if (!req.file) {
    sendError(res, 400, 'MISSING_FILE', 'Audio file is required');
    return;
  }

  const rawLang = req.query.language ?? req.body.language;
  const language: SupportedLanguage = isValidLanguage(rawLang) ? rawLang : 'en';

  try {
    const result = await speechToText(req.file.buffer, language);
    sendSuccess(res, result);
  } catch (err) {
    if (err instanceof AppError && err.code === 'STT_ERROR') {
      sendError(res, 503, err.code, err.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    }
  }
});

/**
 * POST /api/v1/voice/tts
 * Converts text to speech audio (MP3).
 * Requires authentication. Body: { text: string, language?: 'en' | 'hi' | 'pa' }
 */
router.post('/tts', async (req: Request, res: Response) => {
  if (!req.farmerId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }

  const { text, language: rawLang } = req.body as { text?: string; language?: unknown };

  if (!text || typeof text !== 'string' || text.trim() === '') {
    sendError(res, 400, 'MISSING_PARAM', 'text is required');
    return;
  }

  const language: SupportedLanguage = isValidLanguage(rawLang) ? rawLang : 'en';

  try {
    const audioBuffer = await textToSpeech(text, language);
    res.status(200).set('Content-Type', 'audio/mpeg').send(audioBuffer);
  } catch (err) {
    if (err instanceof AppError && err.code === 'TTS_ERROR') {
      sendError(res, 503, err.code, err.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
    }
  }
});

export default router;
