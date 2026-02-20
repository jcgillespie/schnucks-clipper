# Bolt's Journal ⚡

## 2026-02-20 - Batching Bottleneck in Coupon Clipping
**Learning:** The current implementation uses "lock-step" batching via `Promise.allSettled` in a `for` loop. This causes the entire process to wait for the slowest request in each batch (including retries) before starting the next batch, under-utilizing the available concurrency.
**Action:** Implement a concurrent worker pool to maintain a constant number of in-flight requests, maximizing throughput and reducing total execution time.
