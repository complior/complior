// AI Error Handler (EU AI Act, Art. 15.4)
// Compliance-aware error handling for AI operations

export interface AIErrorLog {
  readonly timestamp: string;
  readonly operation: string;
  readonly error: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly aiSystemId?: string;
}

const errorLog: AIErrorLog[] = [];

export const withAIErrorHandling = async <T>(
  operation: string,
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    const entry: AIErrorLog = {
      timestamp: new Date().toISOString(),
      operation,
      error: err instanceof Error ? err.message : String(err),
      severity: 'high',
    };
    errorLog.push(entry);
    console.error(`[AI-ERROR] ${operation}: ${entry.error}`);
    return fallback;
  }
};

export const getErrorLog = (): readonly AIErrorLog[] => [...errorLog];
