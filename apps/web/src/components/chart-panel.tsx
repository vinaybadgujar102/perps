import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
} from "lightweight-charts";

const CHART_COLORS = {
  background: "#0b0e11",
  text: "#848e9c",
  grid: "#1a1f28",
  border: "#2b3139",
  up: "#00c087",
  down: "#f6465d",
};

const buildDemoCandles = (): CandlestickData[] => {
  const candles: CandlestickData[] = [];
  let base = 3720;
  const start = new Date("2026-01-01T00:00:00Z");

  for (let i = 1; i <= 120; i += 1) {
    const pointDate = new Date(start);
    pointDate.setUTCDate(start.getUTCDate() + i);
    const time = pointDate.toISOString().slice(0, 10);
    const drift = (Math.sin(i / 8) + Math.cos(i / 13)) * 8;
    const open = base + drift;
    const close = open + (Math.random() - 0.4) * 20;
    const high = Math.max(open, close) + Math.random() * 14;
    const low = Math.min(open, close) - Math.random() * 14;
    candles.push({ time, open, high, low, close });
    base = close;
  }

  return candles;
};

export const ChartPanel = () => {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

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
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <Tabs defaultValue="chart">
          <TabsList>
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="info" disabled>
              Info
            </TabsTrigger>
            <TabsTrigger value="rules" disabled>
              Rules
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-1">
          {["1H", "4H", "1D"].map((interval, index) => (
            <Button
              key={interval}
              variant={index === 0 ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
            >
              {interval}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className={cn("h-[360px] w-full")} ref={chartRef} />
      </CardContent>
    </Card>
  );
};
