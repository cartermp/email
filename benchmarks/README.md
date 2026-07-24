# Performance baseline

Run the repeatable local rendering benchmark with:

```sh
pnpm benchmark
```

It uses the three checked-in real-message fixtures and measures both the
synchronous HTML preparation path and dark-theme iframe startup. The iframe
number is a comparative JSDOM measurement, not browser wall-clock time.

## July 23, 2026

Environment: Node 25.9.0 on the same local development machine.

| Path | Before | After | Change |
| --- | ---: | ---: | ---: |
| `prepareHtml` per email | 0.1935 ms | 0.1977 ms | effectively unchanged |
| Dark iframe boot per email | 1,932.95 ms | 210.62 ms | 89.1% faster (9.2×) |
| Initial visible mailbox data | 325.4 ms | 308.7 ms | 5.1% faster |

The mailbox timing is the median of three read-only requests to the same
Fastmail account, excluding session and mailbox discovery. Before the change,
five independent list requests had to finish before the panel could render.
After the change, one inbox request renders the visible list first; drafts,
sent, spam, and pinned mail stream in afterward (about 147 ms in the measured
run) without blocking the page shell or message pane.

Network timings naturally vary. Use several samples and compare medians rather
than treating a single run as definitive.
