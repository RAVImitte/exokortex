export const SCAN_FREQUENCIES = ["weekly", "biweekly", "monthly"] as const;
export type ScanFrequency = (typeof SCAN_FREQUENCIES)[number];

export function isScanFrequency(value: string): value is ScanFrequency {
  return (SCAN_FREQUENCIES as readonly string[]).includes(value);
}

export const limits = {
  maxRepositories: 100,
  maxPortfolioProjects: 200,
  maxCuratorFollowups: 5,
  maxEngineerAttempts: 2,
  scoutAttempts: 3,
  analystAttempts: 3,
  curatorAttempts: 3,
  scanAttempts: 3,
  defaultScanFrequency: "weekly" as ScanFrequency,
  lockTimeoutMs: 15 * 60 * 1000,
};

export function addFrequency(from: Date, frequency: ScanFrequency): Date {
  const next = new Date(from.getTime());
  const days = frequency === "weekly" ? 7 : frequency === "biweekly" ? 14 : 30;
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
