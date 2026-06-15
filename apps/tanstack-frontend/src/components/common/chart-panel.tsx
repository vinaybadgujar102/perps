import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  createChart,
  type IChartApi,
} from "lightweight-charts";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { buildDemoCandles } from "#/lib/demo-candles";

const CHART_COLORS = {
  background: "#0a0a0a",
  text: "#8c8c8c",
  grid: "#262626",
  border: "#262626",
  up: "#00ff41",
  down: "#ff3d00",
};

type ChartView = "chart" | "depth";

export function ChartPanel() {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<IChartApi | null>(null);
  const [view, setView] = useState<ChartView>("chart");

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
      rightPriceScale: { borderColor: CHART_COLORS.border },
      timeScale: { borderColor: CHART_COLORS.border },
      crosshair: { mode: 0 },
      autoSize: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.up,
      downColor: CHART_COLORS.down,
      borderVisible: false,
      wickUpColor: CHART_COLORS.up,
      wickDownColor: CHART_COLORS.down,
    });
    series.setData(buildDemoCandles());

    apiRef.current = chart;
    return () => {
      apiRef.current?.remove();
      apiRef.current = null;
    };
  }, [view]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col border-t border-border bg-background">
      <div className="absolute top-4 left-4 z-20 flex gap-2">
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
      </div>

      {view === "chart" ? (
        <div className="min-h-0 flex-1 w-full" ref={chartRef} />
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center text-input-label mono-label text-xs">
          Depth chart coming soon
        </div>
      )}
    </div>
  );
}
