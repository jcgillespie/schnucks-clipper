import { AppConfigurationClient } from '@azure/app-configuration';
import { DefaultAzureCredential } from '@azure/identity';
import { logger } from './logger.js';
import type { RunSummary, IRunSummaryStore } from './run-summary-store.js';

/**
 * App Configuration-based implementation of run summary store.
 * Stores run summaries as JSON in App Configuration key-value store.
 */
export class AppConfigRunSummaryStore implements IRunSummaryStore {
  private client: AppConfigurationClient;

  constructor(endpoint: string, connectionString?: string, client?: AppConfigurationClient) {
    if (client) {
      this.client = client;
    } else if (connectionString) {
      this.client = new AppConfigurationClient(connectionString);
    } else {
      this.client = new AppConfigurationClient(endpoint, new DefaultAzureCredential());
    }
  }

  /**
   * Generate a key for a run summary based on timestamp and execution ID
   */
  private getRunKey(summary: RunSummary): string {
    // Keys are in format: "run:{timestamp}:{executionId}"
    // This allows sorting by timestamp while maintaining uniqueness
    return `run:${summary.timestamp}:${summary.executionId}`;
  }

  async writeRun(summary: RunSummary): Promise<void> {
    try {
      const key = this.getRunKey(summary);
      const value = JSON.stringify(summary);

      logger.debug('Writing run summary to App Configuration', { key });
      await this.client.setConfigurationSetting({
        key,
        value,
        label: 'run',
        contentType: 'application/json',
      });

      logger.debug('Run summary written successfully', { key });
    } catch (error) {
      logger.error('Failed to write run summary to App Configuration', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listRuns(sinceDateEpochMs: number): Promise<RunSummary[]> {
    try {
      logger.debug('Querying run summaries from App Configuration', { since: sinceDateEpochMs });

      const results: RunSummary[] = [];

      // Query all keys matching pattern "run:*"
      for await (const setting of this.client.listConfigurationSettings({
        keyFilter: 'run:*',
        labelFilter: 'run',
      })) {
        if (!setting.value) {
          continue;
        }

        try {
          const summary = JSON.parse(setting.value) as RunSummary;
          if (summary.timestamp >= sinceDateEpochMs) {
            results.push(summary);
          }
        } catch (parseError) {
          logger.warn('Failed to parse run summary from App Configuration', {
            key: setting.key,
            error: parseError instanceof Error ? parseError.message : String(parseError),
          });
        }
      }

      // Sort by timestamp descending
      results.sort((a, b) => b.timestamp - a.timestamp);

      logger.debug('Retrieved run summaries from App Configuration', { count: results.length });
      return results;
    } catch (error) {
      logger.error('Failed to query run summaries from App Configuration', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async listRunsSince(lookbackDays: number): Promise<RunSummary[]> {
    const now = Date.now();
    const sinceDateEpochMs = now - lookbackDays * 24 * 60 * 60 * 1000;
    return this.listRuns(sinceDateEpochMs);
  }
}
