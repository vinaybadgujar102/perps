import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
} from "lightweight-charts";

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
        background: { color: "#0B0E11" },
        textColor: "#848E9C",
      },
      grid: {
        vertLines: { color: "#1A1F28" },
        horzLines: { color: "#1A1F28" },
      },
      rightPriceScale: { borderColor: "#2B3139" },
      timeScale: { borderColor: "#2B3139" },
      crosshair: { mode: 0 },
      autoSize: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#00C087",
      downColor: "#F6465D",
      borderVisible: false,
      wickUpColor: "#00C087",
      wickDownColor: "#F6465D",
    });
    series.setData(buildDemoCandles());

    apiRef.current = chart;
    return () => {
      apiRef.current?.remove();
      apiRef.current = null;
    };
  }, []);

  return (
    <section className="panel chart-panel">
      <div className="panel-title-row chart-tabs">
        <div className="inline-tabs">
          <button type="button" className="is-active">
            Chart
          </button>
          <button type="button">Info</button>
          <button type="button">Rules</button>
        </div>
        <div className="inline-tabs compact">
          <button type="button" className="is-active">
            1H
          </button>
          <button type="button">4H</button>
          <button type="button">1D</button>
        </div>
      </div>
      <div className="chart-canvas" ref={chartRef} />
    </section>
  );
};
