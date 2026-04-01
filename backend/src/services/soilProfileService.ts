import { query } from '../db';
import { AppError } from './userService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SoilProfileData {
  plotName?: string;
  latitude?: number;
  longitude?: number;
  soilType?: string;
  ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
}

export interface SoilProfile {
  id: string;
  farmerId: string;
  plotName?: string;
  latitude?: number;
  longitude?: number;
  soilType?: string;
  ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── DB row type ──────────────────────────────────────────────────────────────

interface SoilProfileRow {
  id: string;
  farmer_id: string;
  plot_name: string | null;
  latitude: string | null;
  longitude: string | null;
  soil_type: string | null;
  ph: string | null;
  nitrogen: string | null;
  phosphorus: string | null;
  potassium: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateSoilProfileData(data: Partial<SoilProfileData>): void {
  if (data.ph !== undefined) {
    if (data.ph < 0 || data.ph > 14) {
      throw new AppError('VALIDATION_ERROR', 'pH must be between 0 and 14', 'ph');
    }
  }
  if (data.nitrogen !== undefined && data.nitrogen < 0) {
    throw new AppError('VALIDATION_ERROR', 'nitrogen must be a non-negative number', 'nitrogen');
  }
  if (data.phosphorus !== undefined && data.phosphorus < 0) {
    throw new AppError('VALIDATION_ERROR', 'phosphorus must be a non-negative number', 'phosphorus');
  }
  if (data.potassium !== undefined && data.potassium < 0) {
    throw new AppError('VALIDATION_ERROR', 'potassium must be a non-negative number', 'potassium');
  }
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Create a new soil profile for a farmer.
 * Validates pH is in [0, 14] and NPK values are non-negative.
 */
export async function createSoilProfile(
  farmerId: string,
  data: SoilProfileData
): Promise<SoilProfile> {
  validateSoilProfileData(data);

  const result = await query<SoilProfileRow>(
    `INSERT INTO soil_profiles
       (farmer_id, plot_name, latitude, longitude, soil_type, ph, nitrogen, phosphorus, potassium)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      farmerId,
      data.plotName ?? null,
      data.latitude ?? null,
      data.longitude ?? null,
      data.soilType ?? null,
      data.ph ?? null,
      data.nitrogen ?? null,
      data.phosphorus ?? null,
      data.potassium ?? null,
    ]
  );

  return rowToSoilProfile(result.rows[0]);
}

/**
 * Update an existing soil profile.
 * Only provided fields are updated; updated_at is always bumped.
 * Throws NOT_FOUND if the profile doesn't exist or doesn't belong to the farmer.
 */
export async function updateSoilProfile(
  profileId: string,
  farmerId: string,
  data: Partial<SoilProfileData>
): Promise<SoilProfile> {
  validateSoilProfileData(data);

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.plotName !== undefined) {
    setClauses.push(`plot_name = $${idx++}`);
    values.push(data.plotName);
  }
  if (data.latitude !== undefined) {
    setClauses.push(`latitude = $${idx++}`);
    values.push(data.latitude);
  }
  if (data.longitude !== undefined) {
    setClauses.push(`longitude = $${idx++}`);
    values.push(data.longitude);
  }
  if (data.soilType !== undefined) {
    setClauses.push(`soil_type = $${idx++}`);
    values.push(data.soilType);
  }
  if (data.ph !== undefined) {
    setClauses.push(`ph = $${idx++}`);
    values.push(data.ph);
  }
  if (data.nitrogen !== undefined) {
    setClauses.push(`nitrogen = $${idx++}`);
    values.push(data.nitrogen);
  }
  if (data.phosphorus !== undefined) {
    setClauses.push(`phosphorus = $${idx++}`);
    values.push(data.phosphorus);
  }
  if (data.potassium !== undefined) {
    setClauses.push(`potassium = $${idx++}`);
    values.push(data.potassium);
  }

  // Always bump updated_at
  setClauses.push(`updated_at = now()`);

  // WHERE clause params
  values.push(profileId);   // $idx
  values.push(farmerId);    // $idx+1

  const result = await query<SoilProfileRow>(
    `UPDATE soil_profiles
     SET ${setClauses.join(', ')}
     WHERE id = $${idx} AND farmer_id = $${idx + 1}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new AppError('NOT_FOUND', 'Soil profile not found');
  }

  return rowToSoilProfile(result.rows[0]);
}

/**
 * Retrieve a soil profile by ID, scoped to the requesting farmer.
 * Throws NOT_FOUND if the profile doesn't exist or belongs to a different farmer.
 */
export async function getSoilProfile(
  profileId: string,
  farmerId: string
): Promise<SoilProfile> {
  const result = await query<SoilProfileRow>(
    'SELECT * FROM soil_profiles WHERE id = $1',
    [profileId]
  );

  if (result.rows.length === 0 || result.rows[0].farmer_id !== farmerId) {
    throw new AppError('NOT_FOUND', 'Soil profile not found');
  }

  return rowToSoilProfile(result.rows[0]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToSoilProfile(row: SoilProfileRow): SoilProfile {
  return {
    id: row.id,
    farmerId: row.farmer_id,
    plotName: row.plot_name ?? undefined,
    latitude: row.latitude != null ? parseFloat(row.latitude) : undefined,
    longitude: row.longitude != null ? parseFloat(row.longitude) : undefined,
    soilType: row.soil_type ?? undefined,
    ph: row.ph != null ? parseFloat(row.ph) : undefined,
    nitrogen: row.nitrogen != null ? parseFloat(row.nitrogen) : undefined,
    phosphorus: row.phosphorus != null ? parseFloat(row.phosphorus) : undefined,
    potassium: row.potassium != null ? parseFloat(row.potassium) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
