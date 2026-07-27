/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SITE_EMAIL: string;
  readonly SITE_PHONE: string;
  readonly SITE_GITHUB_URL: string;
  readonly SITE_LINKEDIN_URL: string;
  readonly SITE_BLUESKY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
