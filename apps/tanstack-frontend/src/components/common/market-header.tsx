const MARKET_STATS = {
  pair: "BTC / USD",
  watermark: "BTC",
  indexPrice: "61,944.1",
  change: "+529.7 (+0.86%)",
  high: "62,400.0",
  low: "60,700.0",
  volume: "3,816,164.42",
};

export function MarketHeader() {
  return (
    <div className="border-b border-border bg-surface/30 p-6">
      <div className="flex flex-wrap items-end gap-x-12 gap-y-4">
        <div className="relative">
          <span className="display-xl pointer-events-none absolute -top-6 left-0 select-none opacity-[0.03]">
            {MARKET_STATS.watermark}
          </span>
          <h1 className="headline-lg font-extrabold tracking-tighter">
            {MARKET_STATS.pair}
          </h1>
        </div>

        <div className="flex flex-col">
          <span className="mono-label mb-1 text-input-label">Index Price</span>
          <span className="font-mono text-4xl font-extrabold tracking-tighter">
            {MARKET_STATS.indexPrice}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          <div className="flex flex-col">
            <span className="mono-label mb-1 text-input-label">24h Change</span>
            <span className="font-mono text-trading-green">
              {MARKET_STATS.change}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="mono-label mb-1 text-input-label">24h High</span>
            <span className="font-mono text-foreground">{MARKET_STATS.high}</span>
          </div>
          <div className="flex flex-col">
            <span className="mono-label mb-1 text-input-label">24h Low</span>
            <span className="font-mono text-foreground">{MARKET_STATS.low}</span>
          </div>
          <div className="flex flex-col">
            <span className="mono-label mb-1 text-input-label">24h Volume</span>
            <span className="font-mono text-foreground">{MARKET_STATS.volume}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
