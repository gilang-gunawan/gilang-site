function requireEnv(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Copy .env.example to .env and fill in your values.`
    );
  }
  return value;
}

export const contact = {
  email: requireEnv('SITE_EMAIL'),
  phone: requireEnv('SITE_PHONE'),
  github: requireEnv('SITE_GITHUB_URL'),
  linkedin: requireEnv('SITE_LINKEDIN_URL'),
  bluesky: import.meta.env.SITE_BLUESKY_URL || undefined,
};
