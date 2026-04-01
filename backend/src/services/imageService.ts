import axios from 'axios';
import { config } from '../config';
import { AppError } from './userService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TreatmentOption {
  name: string;
  dosage: string;
  method: string;
}

export interface DiagnosisResult {
  pestOrDisease: string;
  confidence: number;
  treatments: {
    chemical: TreatmentOption[];
    organic: TreatmentOption[];
  };
  lowConfidence: boolean;
  extensionOfficerReferral: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const VISION_TIMEOUT_MS = 10_000;
const LOW_CONFIDENCE_THRESHOLD = 0.6;

// ─── ImageService ─────────────────────────────────────────────────────────────

/**
 * Validates and forwards an uploaded image to the Vision Engine for analysis.
 * Returns a structured diagnosis result.
 */
export async function analyzeImage(file: Express.Multer.File): Promise<DiagnosisResult> {
  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new AppError(
      'UNSUPPORTED_MEDIA_TYPE',
      `Unsupported file type. Accepted formats: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(
      'PAYLOAD_TOO_LARGE',
      `File too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)} MB`
    );
  }

  // Build multipart form and forward to Vision Engine
  const form = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype });
  form.append('image', blob, file.originalname);

  try {
    const response = await axios.post<{
      pest_or_disease: string;
      confidence: number;
      treatments: {
        chemical: Array<{ name: string; dosage: string; method: string }>;
        organic: Array<{ name: string; dosage: string; method: string }>;
      };
    }>(`${config.visionEngineUrl}/internal/vision/analyze`, form, {
      timeout: VISION_TIMEOUT_MS,
    });

    const { pest_or_disease, confidence, treatments } = response.data;
    const lowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD;

    return {
      pestOrDisease: pest_or_disease,
      confidence,
      treatments: {
        chemical: treatments.chemical,
        organic: treatments.organic,
      },
      lowConfidence,
      extensionOfficerReferral: lowConfidence,
    };
  } catch (err: unknown) {
    // Vision Engine unavailable (503) or network error
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 503 || !err.response) {
        throw new AppError('VISION_ENGINE_UNAVAILABLE', 'Vision Engine is currently unavailable');
      }
    }
    throw err;
  }
}
