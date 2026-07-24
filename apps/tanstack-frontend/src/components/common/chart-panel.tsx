import type { CandleInterval } from "@repo/sharedtypes";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import { Button } from "#/components/ui/button";
import { useTradingMarket } from "#/contexts/trading-market-context";
import { useCandles } from "#/hooks/use-candles";
import { useLiveCandleUpdates } from "#/hooks/use-live-candle-updates";
import {
  candlePricePadding,
  toChartCandles,
} from "#/lib/chart/format-candles";
import { cn } from "#/lib/utils";

const CHART_COLORS = {
  background: "#0a0a0a",
  text: "#8c8c8c",
  grid: "#262626",
  border: "#262626",
  up: "#00ff41",
  down: "#ff3d00",
};

const INTERVALS: CandleInterval[] = ["1m", "5m"];

type ChartView = "chart" | "depth";

export function ChartPanel() {
  const { market, config } = useTradingMarket();
  const [interval, setInterval] = useState<CandleInterval>("1m");
  const [view, setView] = useState<ChartView>("chart");
  const chartRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const candlesQuery = useCandles(market, interval);
  const historicalCandles = useMemo(
    () => candlesQuery.data?.candles ?? [],
    [candlesQuery.data?.candles],
  );

  useEffect(() => {
    if (!chartRef.current || view !== "chart") return;

    const chart = createChart(chartRef.current, {
      layout: {
        background: { color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.border,
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
      timeScale: {
        borderColor: CHART_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
      },
      crosshair: { mode: 0 },
      autoSize: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.up,
      downColor: CHART_COLORS.down,
      borderVisible: true,
      borderUpColor: CHART_COLORS.up,
      borderDownColor: CHART_COLORS.down,
      wickUpColor: CHART_COLORS.up,
      wickDownColor: CHART_COLORS.down,
    });

    seriesRef.current = series;
    apiRef.current = chart;

    return () => {
      seriesRef.current = null;
      apiRef.current?.remove();
      apiRef.current = null;
    };
  }, [view, market, interval]);

  useEffect(() => {
    const chart = apiRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    const chartCandles = toChartCandles(historicalCandles);
    series.setData(chartCandles);

    if (chartCandles.length === 0) return;

    const padding = candlePricePadding(historicalCandles);
    if (padding > 0) {
      const minLow = Math.min(...historicalCandles.map((candle) => candle.low));
      const maxHigh = Math.max(
        ...historicalCandles.map((candle) => candle.high),
      );
      chart.priceScale("right").applyOptions({
        autoScale: true,
        scaleMargins: { top: 0.15, bottom: 0.15 },
      });
      series.applyOptions({
        autoscaleInfoProvider: () => ({
          priceRange: {
            minValue: minLow - padding,
            maxValue: maxHigh + padding,
          },
        }),
      });
    }

    chart.timeScale().fitContent();
  }, [historicalCandles]);

  const hostedDemo = import.meta.env.VITE_HOSTED_DEMO === "true";

  useLiveCandleUpdates({
    seriesRef,
    market,
    interval,
    priceScale: config.priceScale,
    historicalCandles,
    enabled: !hostedDemo,
  });

  const showEmptyState =
    view === "chart" &&
    !candlesQuery.isLoading &&
    !candlesQuery.isError &&
    historicalCandles.length === 0;

  const showSparseHint =
    view === "chart" &&
    !hostedDemo &&
    !candlesQuery.isLoading &&
    historicalCandles.length > 0 &&
    historicalCandles.length < 10;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col border-t border-border bg-background">
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="xs"
          className={cn(
            "mono-label h-auto border-border bg-surface px-3 py-1 text-white",
            view === "chart" && "border-border",
          )}
          onClick={() => setView("chart")}
        >
          Chart
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="mono-label h-auto px-3 py-1 text-input-label hover:text-foreground"
          disabled
          onClick={() => setView("depth")}
        >
          Depth
        </Button>
        {INTERVALS.map((value) => (
          <Button
            key={value}
            type="button"
            variant={interval === value ? "outline" : "ghost"}
            size="xs"
            className={cn(
              "mono-label h-auto px-3 py-1",
              interval === value
                ? "border-border bg-surface text-white"
                : "text-input-label hover:text-foreground",
            )}
            onClick={() => setInterval(value)}
          >
            {value}
          </Button>
        ))}
      </div>

      {view === "chart" ? (
        <div className="relative min-h-0 flex-1 w-full">
          <div className="min-h-0 flex-1 w-full h-full" ref={chartRef} />
          {candlesQuery.isLoading ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60">
              <span className="mono-label text-input-label text-xs">
                Loading candles…
              </span>
            </div>
          ) : null}
          {candlesQuery.isError ? (
            <div className="pointer-events-none absolute top-14 left-4">
              <span className="mono-label text-destructive text-xs">
                {candlesQuery.error instanceof Error
                  ? candlesQuery.error.message
                  : "Failed to load candles"}
              </span>
            </div>
          ) : null}
          {showSparseHint ? (
            <div className="pointer-events-none absolute top-14 right-4">
              <span className="mono-label text-input-label text-xs">
                Limited history — run the simulator to build more candles
              </span>
            </div>
          ) : null}
          {showEmptyState ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="mono-label text-input-label text-xs">
                No trade history yet — live trades will appear here
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center text-input-label mono-label text-xs">
          Depth chart coming soon
        </div>
      )}
    </div>
  );
}
