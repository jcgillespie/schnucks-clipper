/**
 * Interface for storing and retrieving run summaries.
 * This decouples the app from specific storage backends (App Config, Cosmos, etc).
 */

export interface RunSummary {
  timestamp: number; // epoch milliseconds
  executionId: string; // unique ID per run
  status: 'success' | 'failure';
  jobType: 'clipper' | 'weekly-summary';
  clipped?: number;
  failed?: number;
  skipped?: number;
  errorReasons?: string[];
  errorMessage?: string;
}

export interface IRunSummaryStore {
  /**
   * Write a single run summary to the store
   */
  writeRun(summary: RunSummary): Promise<void>;

  /**
   * List all runs since a given time (epoch milliseconds)
   */
  listRuns(sinceDateEpochMs: number): Promise<RunSummary[]>;

  /**
   * Get all runs within a lookback period (in days)
   */
  listRunsSince(lookbackDays: number): Promise<RunSummary[]>;
}
