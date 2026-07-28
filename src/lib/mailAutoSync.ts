export const MAIL_AUTO_SYNC_INTERVAL_MS = 15_000;
export const MAIL_AUTO_SYNC_MAX_DELAY_MS = 120_000;
export const MAIL_AUTO_SYNC_MIN_IMMEDIATE_GAP_MS = 5_000;

export interface MailSyncSnapshot {
  emailState: string;
}

export function mailSyncSnapshotKey(snapshot: MailSyncSnapshot): string {
  return snapshot.emailState;
}

export function getMailAutoSyncDelay(
  consecutiveFailures: number,
  baseDelayMs = MAIL_AUTO_SYNC_INTERVAL_MS,
): number {
  const safeFailures = Math.max(0, Math.min(consecutiveFailures, 8));
  return Math.min(
    baseDelayMs * 2 ** safeFailures,
    MAIL_AUTO_SYNC_MAX_DELAY_MS,
  );
}

export function canRunImmediateMailSync(
  lastCheckAt: number,
  now: number,
  minimumGapMs = MAIL_AUTO_SYNC_MIN_IMMEDIATE_GAP_MS,
): boolean {
  return now - lastCheckAt >= minimumGapMs;
}
