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
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APP_BASE_URL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}

export interface JobMessage {
  jobId: string;
}
