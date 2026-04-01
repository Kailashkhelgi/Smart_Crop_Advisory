import axios from 'axios';
import Redis from 'ioredis';
import { config } from '../config';
import { AppError } from './userService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeatherData {
  lat: number;
  lon: number;
  temperature: number;
  humidity: number;
  rainfall24h: number;
  frostRisk: boolean;
  forecast: Array<{ time: string; temp: number; rain: number }>;
  lastUpdated: string; // ISO timestamp
}

// Lazy import to avoid circular dependency — notificationService may import weatherService
type SendWeatherAlertFn = (
  lat: number,
  lon: number,
  alertType: 'heavy_rain' | 'frost',
  data: WeatherData
) => Promise<void>;

// ─── Redis singleton ──────────────────────────────────────────────────────────

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(config.redisUrl);
  }
  return _redis;
}

// ─── OpenWeatherMap response types ───────────────────────────────────────────

interface OWMForecastItem {
  dt_txt: string;
  main: { temp: number; humidity: number };
  rain?: { '3h'?: number };
}

interface OWMForecastResponse {
  list: OWMForecastItem[];
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Fetch weather from OpenWeatherMap, cache in Redis, and trigger alerts if needed.
 * Stores result at `weather:{lat}:{lon}` with 6-hour TTL.
 * Also stores a permanent fallback at `weather:last:{lat}:{lon}`.
 */
export async function fetchAndCacheWeather(
  lat: number,
  lon: number,
  redis: Redis = getRedis(),
  notifyFn?: SendWeatherAlertFn
): Promise<WeatherData> {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${config.openWeatherMapApiKey}&units=metric`;

  const response = await axios.get<OWMForecastResponse>(url);
  const items = response.data.list;

  // Current conditions from first item
  const current = items[0];
  const temperature = current.main.temp;
  const humidity = current.main.humidity;

  // Aggregate rainfall and check frost risk over next 24 h (8 x 3-hour slots)
  const next24h = items.slice(0, 8);
  const rainfall24h = next24h.reduce((sum, item) => sum + (item.rain?.['3h'] ?? 0), 0);
  const frostRisk = next24h.some((item) => item.main.temp < 2);

  const forecast = items.slice(0, 16).map((item) => ({
    time: item.dt_txt,
    temp: item.main.temp,
    rain: item.rain?.['3h'] ?? 0,
  }));

  const weatherData: WeatherData = {
    lat,
    lon,
    temperature,
    humidity,
    rainfall24h,
    frostRisk,
    forecast,
    lastUpdated: new Date().toISOString(),
  };

  const serialized = JSON.stringify(weatherData);
  const cacheKey = `weather:${lat}:${lon}`;
  const fallbackKey = `weather:last:${lat}:${lon}`;

  // Cache with 6-hour TTL
  await redis.set(cacheKey, serialized, 'EX', 21600);
  // Permanent fallback (no TTL)
  await redis.set(fallbackKey, serialized);

  // Trigger alerts if thresholds are breached
  const resolvedNotify = notifyFn ?? (await loadNotifyFn());
  if (resolvedNotify) {
    if (rainfall24h > 50) {
      await resolvedNotify(lat, lon, 'heavy_rain', weatherData).catch(() => {
        // Non-fatal: log but don't fail the weather fetch
      });
    }
    if (frostRisk) {
      await resolvedNotify(lat, lon, 'frost', weatherData).catch(() => {
        // Non-fatal
      });
    }
  }

  return weatherData;
}

/**
 * Get weather for a location, using Redis cache when available.
 * Falls back to fetchAndCacheWeather on cache miss.
 * Throws WEATHER_UNAVAILABLE (503) if API is down and cache is empty.
 */
export async function getWeather(
  lat: number,
  lon: number,
  redis: Redis = getRedis()
): Promise<WeatherData> {
  const cacheKey = `weather:${lat}:${lon}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached) as WeatherData;
  }

  try {
    return await fetchAndCacheWeather(lat, lon, redis);
  } catch (err: unknown) {
    // API is down — try the permanent fallback key
    const fallbackKey = `weather:last:${lat}:${lon}`;
    const fallback = await redis.get(fallbackKey);
    if (fallback) {
      return JSON.parse(fallback) as WeatherData;
    }

    throw new AppError(
      'WEATHER_UNAVAILABLE',
      'Weather service is currently unavailable and no cached data exists'
    );
  }
}

/**
 * Schedule weather polling every 6 hours for the given farmer locations.
 */
export function scheduleWeatherPolling(
  farmerLocations: Array<{ lat: number; lon: number }>,
  redis: Redis = getRedis()
): void {
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

  setInterval(() => {
    for (const { lat, lon } of farmerLocations) {
      fetchAndCacheWeather(lat, lon, redis).catch((err: unknown) => {
        console.error(`[WeatherService] Failed to poll weather for ${lat},${lon}:`, err);
      });
    }
  }, SIX_HOURS_MS);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Lazily load the notification service to avoid circular dependency issues.
 * Returns undefined if the module is not yet available.
 */
async function loadNotifyFn(): Promise<SendWeatherAlertFn | undefined> {
  try {
    // Dynamic require to avoid circular dependency at module load time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ns = require('./notificationService') as { sendWeatherAlert?: SendWeatherAlertFn };
    return ns.sendWeatherAlert;
  } catch {
    return undefined;
  }
}
