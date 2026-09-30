// Structured server logs (brief §13): one JSON object per line, on stdout (info) or stderr
// (warn, error), which PM2 writes to ~/.pm2/logs. Never log personal data: callers pass ids,
// statuses and counts only, never an answer, a name, an e-mail address, a phone number or an IP.

export type LogLevel = 'info' | 'warn' | 'error';
export type LogFields = Readonly<Record<string, string | number | boolean | null | undefined>>;
export type Logger = (level: LogLevel, event: string, fields?: LogFields) => void;

export const consoleLogger: Logger = (level, event, fields = {}) => {
  const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...fields });
  if (level === 'info') console.log(line);
  else console.error(line);
};

/** An error's name and a short message for a log line (never its stack or cause). */
export function errorSummary(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`.slice(0, 300);
  return typeof error === 'string' ? error.slice(0, 300) : 'unknown error';
}
