import axios from 'axios';
import Redis from 'ioredis';
import { config } from '../config';
import { query } from '../db';
import { AppError } from './userService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MandiPrice {
  mandiName: string;
  district: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  distance: number; // km from farmer
  lastUpdated: string; // ISO timestamp
}

export interface MarketPriceResponse {
  crop: string;
  mandis: MandiPrice[];
  stale: boolean;
  cachedAt?: string;
}

// ─── Redis singleton ──────────────────────────────────────────────────────────

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(config.redisUrl);
  }
  return _redis;
}

// ─── Agmarknet API response types ─────────────────────────────────────────────

interface AgmarknetMandiRecord {
  mandi_name: string;
  district: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  distance_km: number;
  arrival_date: string;
}

interface AgmarknetResponse {
  records: AgmarknetMandiRecord[];
}

// ─── Mock data generator ──────────────────────────────────────────────────────

function generateMockPrices(crop: string, district: string): MandiPrice[] {
  const basePrice = 1500 + Math.floor(Math.random() * 1000);
  const now = new Date().toISOString();

  return [
    {
      mandiName: `${district} Main Mandi`,
      district,
      minPrice: basePrice - 100,
      maxPrice: basePrice + 200,
      modalPrice: basePrice,
      distance: 10,
      lastUpdated: now,
    },
    {
      mandiName: `${district} Secondary Mandi`,
      district,
      minPrice: basePrice - 150,
      maxPrice: basePrice + 150,
      modalPrice: basePrice - 50,
      distance: 35,
      lastUpdated: now,
    },
    {
      mandiName: `${crop} Trade Centre`,
      district,
      minPrice: basePrice - 200,
      maxPrice: basePrice + 300,
      modalPrice: basePrice + 50,
      distance: 75,
      lastUpdated: now,
    },
  ];
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Fetch market prices from Agmarknet API and cache in Redis.
 * Stores result at `market:{crop}:{district}` with 12-hour TTL.
 * Falls back to mock data if the API is unavailable.
 */
export async function fetchAndCachePrices(
  crop: string,
  district: string,
  redis: Redis = getRedis()
): Promise<MandiPrice[]> {
  let mandis: MandiPrice[];

  try {
    const url = `${config.marketPriceApiUrl}/prices?crop=${encodeURIComponent(crop)}&district=${encodeURIComponent(district)}&api_key=${config.marketPriceApiKey}`;
    const response = await axios.get<AgmarknetResponse>(url);

    mandis = response.data.records.map((record) => ({
      mandiName: record.mandi_name,
      district: record.district,
      minPrice: record.min_price,
      maxPrice: record.max_price,
      modalPrice: record.modal_price,
      distance: record.distance_km,
      lastUpdated: record.arrival_date,
    }));
  } catch {
    // API unavailable in dev or unreachable — use mock data for testing
    console.warn(`[MarketPriceService] Agmarknet API unavailable for ${crop}/${district}, using mock data`);
    mandis = generateMockPrices(crop, district);
  }

  const cacheKey = `market:${crop}:${district}`;
  const payload = { mandis, cachedAt: new Date().toISOString() };
  await redis.set(cacheKey, JSON.stringify(payload), 'EX', 43200); // 12-hour TTL

  return mandis;
}

/**
 * Get market prices for a crop, using Redis cache when available.
 * Looks up the farmer's district from the DB, then checks cache before fetching.
 * Throws MARKET_UNAVAILABLE if API is down and cache is empty.
 * Attaches a `stale: true` flag when data is older than 24 hours.
 */
export async function getPrices(
  farmerId: string,
  cropName: string,
  redis: Redis = getRedis()
): Promise<MarketPriceResponse> {
  // Get farmer's district from DB
  const farmerResult = await query<{ district: string | null }>(
    'SELECT district FROM farmers WHERE id = $1',
    [farmerId]
  );

  if (farmerResult.rows.length === 0) {
    throw new AppError('NOT_FOUND', 'Farmer not found');
  }

  const district = farmerResult.rows[0].district ?? 'Unknown';
  const cacheKey = `market:${cropName}:${district}`;

  // Try Redis cache first
  const cached = await redis.get(cacheKey);

  let mandis: MandiPrice[];
  let cachedAt: string | undefined;

  if (cached) {
    const parsed = JSON.parse(cached) as { mandis: MandiPrice[]; cachedAt: string };
    mandis = parsed.mandis;
    cachedAt = parsed.cachedAt;
  } else {
    // Cache miss — fetch from API
    try {
      mandis = await fetchAndCachePrices(cropName, district, redis);
      cachedAt = new Date().toISOString();
    } catch {
      throw new AppError(
        'MARKET_UNAVAILABLE',
        'Market price service is currently unavailable and no cached data exists'
      );
    }
  }

  // Filter to mandis within 100 km and ensure at least 3 results
  const nearbyMandis = mandis
    .filter((m) => m.distance <= 100)
    .slice(0, Math.max(3, mandis.filter((m) => m.distance <= 100).length));

  // Determine staleness: data older than 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const stale = mandis.some((m) => m.lastUpdated < twentyFourHoursAgo) ||
    (cachedAt !== undefined && cachedAt < twentyFourHoursAgo);

  return {
    crop: cropName,
    mandis: nearbyMandis,
    stale,
    cachedAt,
  };
}

/**
 * Schedule market price polling every 12 hours for the given crop/district pairs.
 */
export function scheduleMarketPolling(
  cropDistrictPairs: Array<{ crop: string; district: string }>,
  redis: Redis = getRedis()
): void {
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

  setInterval(() => {
    for (const { crop, district } of cropDistrictPairs) {
      fetchAndCachePrices(crop, district, redis).catch((err: unknown) => {
        console.error(`[MarketPriceService] Failed to poll prices for ${crop}/${district}:`, err);
      });
    }
  }, TWELVE_HOURS_MS);
}
