import axios from 'axios';
import { config } from '../config';
import { query } from '../db';
import { AppError } from './userService';
import { getSoilProfile } from './soilProfileService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CropRecommendation {
  name: string;
  yieldRange: { min: number; max: number };
  waterRequirement: string;
  estimatedInputCost: number;
}

export interface FertilizerSchedule {
  schedule: Array<{ type: string; quantity: number; unit: string; timing: string }>;
  organicAlternatives: Array<{ type: string; quantity: number; unit: string; timing: string }>;
  soilAmendments: Array<{ type: string; quantity: number; unit: string; reason: string }>;
}

interface CropHistoryRow {
  crop_name: string;
  season: string | null;
  year: number | null;
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Get crop recommendations for a farmer's plot.
 * Fetches soil profile and crop history, then calls the Advisory Engine.
 * Throws INCOMPLETE_SOIL_PROFILE if required soil fields are missing.
 * Throws ADVISORY_ENGINE_UNAVAILABLE if the engine is unreachable or returns 503.
 */
export async function getCropRecommendations(
  farmerId: string,
  plotId: string
): Promise<CropRecommendation[]> {
  const soilProfile = await getSoilProfile(plotId, farmerId);

  // Validate required fields
  if (
    soilProfile.ph == null ||
    soilProfile.nitrogen == null ||
    soilProfile.phosphorus == null ||
    soilProfile.potassium == null ||
    soilProfile.soilType == null
  ) {
    throw new AppError(
      'INCOMPLETE_SOIL_PROFILE',
      'Soil profile is missing required fields. Please complete ph, nitrogen, phosphorus, potassium, and soil type.'
    );
  }

  // Fetch crop history for this plot
  const historyResult = await query<CropHistoryRow>(
    `SELECT crop_name, season, year
     FROM crop_history
     WHERE farmer_id = $1 AND soil_profile_id = $2
     ORDER BY year DESC, created_at DESC`,
    [farmerId, plotId]
  );

  const cropHistory = historyResult.rows.map((r) => r.crop_name);

  try {
    const response = await axios.post<{ crops: CropRecommendation[] }>(
      `${config.advisoryEngineUrl}/internal/advisory/crops`,
      {
        soil_profile: {
          type: soilProfile.soilType,
          ph: soilProfile.ph,
          n: soilProfile.nitrogen,
          p: soilProfile.phosphorus,
          k: soilProfile.potassium,
        },
        location: {
          lat: soilProfile.latitude ?? null,
          lon: soilProfile.longitude ?? null,
        },
        crop_history: cropHistory,
      }
    );

    return response.data.crops;
  } catch (err: unknown) {
    if (isAdvisoryEngineUnavailable(err)) {
      throw new AppError('ADVISORY_ENGINE_UNAVAILABLE', 'Advisory Engine is currently unavailable');
    }
    throw err;
  }
}

/**
 * Get fertilizer guidance for a farmer's plot and selected crop.
 * Throws NO_SOIL_PROFILE if no soil profile is found.
 * Throws ADVISORY_ENGINE_UNAVAILABLE if the engine is unreachable or returns 503.
 */
export async function getFertilizerGuidance(
  farmerId: string,
  plotId: string,
  cropId: string
): Promise<FertilizerSchedule> {
  let soilProfile;
  try {
    soilProfile = await getSoilProfile(plotId, farmerId);
  } catch (err: unknown) {
    if (err instanceof AppError && err.code === 'NOT_FOUND') {
      throw new AppError('NO_SOIL_PROFILE', 'No soil profile found. Please create a soil profile first.');
    }
    throw err;
  }

  try {
    const response = await axios.post<FertilizerSchedule>(
      `${config.advisoryEngineUrl}/internal/advisory/fertilizer`,
      {
        soil_profile: {
          type: soilProfile.soilType,
          ph: soilProfile.ph,
          n: soilProfile.nitrogen,
          p: soilProfile.phosphorus,
          k: soilProfile.potassium,
        },
        crop_id: cropId,
      }
    );

    return response.data;
  } catch (err: unknown) {
    if (isAdvisoryEngineUnavailable(err)) {
      throw new AppError('ADVISORY_ENGINE_UNAVAILABLE', 'Advisory Engine is currently unavailable');
    }
    throw err;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAdvisoryEngineUnavailable(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  // 503 response from the engine
  if (err.response?.status === 503) return true;
  // Network error / ECONNREFUSED / no response (engine unreachable)
  if (!err.response) return true;
  return false;
}
