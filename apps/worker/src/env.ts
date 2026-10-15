export interface Env {
  DB: D1Database;
  JOBS: Queue<{ jobId: string }>;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
  AUTH_MODE: string;
  ENCRYPTION_KEY: string;
  DEV_SESSION_SECRET?: string;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  GITHUB_APP_ID?: string;
  GITHUB_APP_SLUG?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  APP_BASE_URL?: string;
}

export interface JobMessage {
  jobId: string;
}
