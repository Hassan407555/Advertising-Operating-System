const REQUIRED_ENVIRONMENT_VARIABLES = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'REFRESH_TOKEN_SECRET',
  'REFRESH_TOKEN_EXPIRES_IN',
  'ENCRYPTION_KEY',
  'SHOPIFY_CLIENT_ID',
  'SHOPIFY_CLIENT_SECRET',
  'SHOPIFY_REDIRECT_URI',
  'META_APP_ID',
  'META_APP_SECRET',
  'META_REDIRECT_URI',
] as const;

function readStringEnv(
  environment: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = environment[key];
  return typeof value === 'string' ? value : fallback;
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const missingVariables = REQUIRED_ENVIRONMENT_VARIABLES.filter((key) => {
    const value = environment[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(', ')}`,
    );
  }

  const encryptionKey = String(environment.ENCRYPTION_KEY).trim();
  if (encryptionKey.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters.');
  }

  const jwtSecret = String(environment.JWT_SECRET).trim();
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters.');
  }

  const refreshTokenSecret = String(environment.REFRESH_TOKEN_SECRET).trim();
  if (refreshTokenSecret.length < 32) {
    throw new Error('REFRESH_TOKEN_SECRET must be at least 32 characters.');
  }

  const aiProvider = readStringEnv(environment, 'AI_PROVIDER', 'GEMINI')
    .trim()
    .toUpperCase();

  if (aiProvider === 'GEMINI') {
    const geminiApiKey = environment.GEMINI_API_KEY;
    if (typeof geminiApiKey !== 'string' || geminiApiKey.trim().length === 0) {
      throw new Error('Missing required environment variable: GEMINI_API_KEY');
    }
  }

  if (aiProvider === 'GROQ') {
    const groqApiKey = environment.GROQ_API_KEY;
    if (typeof groqApiKey !== 'string' || groqApiKey.trim().length === 0) {
      throw new Error('Missing required environment variable: GROQ_API_KEY');
    }
  }

  const nodeEnv = readStringEnv(environment, 'NODE_ENV', 'development')
    .trim()
    .toLowerCase();
  const isProduction = nodeEnv === 'production';

  if (isProduction) {
    const corsOrigin = environment.CORS_ORIGIN;
    if (typeof corsOrigin !== 'string' || corsOrigin.trim().length === 0) {
      throw new Error(
        'Missing required environment variable in production: CORS_ORIGIN',
      );
    }
    if (corsOrigin.trim() === '*') {
      throw new Error(
        'CORS_ORIGIN cannot be "*" in production. Set explicit origin(s).',
      );
    }
  }

  const port = environment.PORT;
  if (
    port !== undefined &&
    (!Number.isInteger(Number(port)) || Number(port) <= 0)
  ) {
    throw new Error('PORT must be a positive integer.');
  }

  const authRateLimit = environment.AUTH_RATE_LIMIT;
  if (
    authRateLimit !== undefined &&
    (!Number.isInteger(Number(authRateLimit)) || Number(authRateLimit) <= 0)
  ) {
    throw new Error('AUTH_RATE_LIMIT must be a positive integer.');
  }

  const authRateTtl = environment.AUTH_RATE_TTL_MS;
  if (
    authRateTtl !== undefined &&
    (!Number.isInteger(Number(authRateTtl)) || Number(authRateTtl) <= 0)
  ) {
    throw new Error('AUTH_RATE_TTL_MS must be a positive integer.');
  }

  const invitationExpirationHours = environment.INVITATION_EXPIRATION_HOURS;
  if (
    invitationExpirationHours !== undefined &&
    (!Number.isInteger(Number(invitationExpirationHours)) ||
      Number(invitationExpirationHours) <= 0)
  ) {
    throw new Error('INVITATION_EXPIRATION_HOURS must be a positive integer.');
  }

  const metaGraphApiVersion = readStringEnv(
    environment,
    'META_GRAPH_API_VERSION',
    'v23.0',
  ).trim();
  if (!/^v\d+\.\d+$/.test(metaGraphApiVersion)) {
    throw new Error('META_GRAPH_API_VERSION must look like v23.0.');
  }

  const metaTestModeRaw = readStringEnv(
    environment,
    'META_TEST_MODE',
    '',
  ).trim().toLowerCase();
  if (
    metaTestModeRaw.length > 0 &&
    metaTestModeRaw !== 'true' &&
    metaTestModeRaw !== 'false'
  ) {
    throw new Error('META_TEST_MODE must be "true" or "false" when set.');
  }

  return {
    ...environment,
    NODE_ENV: nodeEnv,
    PORT: port ?? 3001,
    AUTH_RATE_LIMIT: authRateLimit ?? 10,
    AUTH_RATE_TTL_MS: authRateTtl ?? 60_000,
    INVITATION_EXPIRATION_HOURS: invitationExpirationHours ?? 168,
    LOG_LEVEL: environment.LOG_LEVEL ?? 'info',
    AI_PROVIDER: aiProvider,
    AI_TEMPERATURE: environment.AI_TEMPERATURE ?? 0.7,
    AI_MAX_OUTPUT_TOKENS: environment.AI_MAX_OUTPUT_TOKENS ?? 2048,
    GEMINI_MODEL: environment.GEMINI_MODEL ?? 'gemini-2.0-flash',
    GROQ_MODEL: environment.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    CORS_ORIGIN: environment.CORS_ORIGIN ?? '*',
    META_GRAPH_API_VERSION: metaGraphApiVersion,
    META_TEST_MODE: metaTestModeRaw || undefined,
    SWAGGER_ENABLED:
      environment.SWAGGER_ENABLED ?? (isProduction ? 'false' : 'true'),
  };
}
