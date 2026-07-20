const REQUIRED_ENVIRONMENT_VARIABLES = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'REFRESH_TOKEN_SECRET',
  'REFRESH_TOKEN_EXPIRES_IN',
] as const;

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

  return {
    ...environment,
    PORT: port ?? 3000,
    AUTH_RATE_LIMIT: authRateLimit ?? 10,
    AUTH_RATE_TTL_MS: authRateTtl ?? 60_000,
    INVITATION_EXPIRATION_HOURS: invitationExpirationHours ?? 168,
    LOG_LEVEL: environment.LOG_LEVEL ?? 'info',
  };
}
