const REQUIRED_ENV_VARS = [
  'PORT',
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'REFRESH_TOKEN_EXPIRES_IN',
  'OTP_PROVIDER_API_KEY',
  'OTP_PROVIDER_SENDER_ID',
  'OPENWEATHERMAP_API_KEY',
  'MARKET_PRICE_API_KEY',
  'MARKET_PRICE_API_URL',
  'GOOGLE_CLOUD_API_KEY',
  'FCM_SERVER_KEY',
  'ADVISORY_ENGINE_URL',
  'VISION_ENGINE_URL',
] as const;

for (const name of REQUIRED_ENV_VARS) {
  if (!process.env[name]) {
    console.error(`[FATAL] Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

export const config = {
  port: parseInt(process.env['PORT'] as string, 10),
  databaseUrl: process.env['DATABASE_URL'] as string,
  redisUrl: process.env['REDIS_URL'] as string,
  jwtSecret: process.env['JWT_SECRET'] as string,
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] as string,
  refreshTokenExpiresIn: process.env['REFRESH_TOKEN_EXPIRES_IN'] as string,
  otpProviderApiKey: process.env['OTP_PROVIDER_API_KEY'] as string,
  otpProviderSenderId: process.env['OTP_PROVIDER_SENDER_ID'] as string,
  openWeatherMapApiKey: process.env['OPENWEATHERMAP_API_KEY'] as string,
  marketPriceApiKey: process.env['MARKET_PRICE_API_KEY'] as string,
  marketPriceApiUrl: process.env['MARKET_PRICE_API_URL'] as string,
  googleCloudApiKey: process.env['GOOGLE_CLOUD_API_KEY'] as string,
  fcmServerKey: process.env['FCM_SERVER_KEY'] as string,
  advisoryEngineUrl: process.env['ADVISORY_ENGINE_URL'] as string,
  visionEngineUrl: process.env['VISION_ENGINE_URL'] as string,
} as const;

export type Config = typeof config;
