# price-poller

Optional. Streams Backpack mark prices into the trade engine for index / liquidation.

| | |
| --- | --- |
| Needs | Redis, outbound Backpack WS |

```bash
# from repo root
bun run dev --filter=price-poller
```

Not required for the standard demo — `simulate:orderbook` seeds prices instead.
