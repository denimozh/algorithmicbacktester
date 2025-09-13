import { useState, useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import { format, parseISO, addDays } from "date-fns";

export default function BacktesterPage() {
  const [asset, setAsset] = useState("Gold/USD");
  const [fromDate, setFromDate] = useState("2024-03-01");
  const [toDate, setToDate] = useState("2024-03-31");
  const [strategy, setStrategy] = useState("TWAP");
  const [data, setData] = useState([]);
  const [trades, setTrades] = useState([]);
  const [startingCapital, setStartingCapital] = useState(10000);
  const [riskPerTrade, setRiskPerTrade] = useState(2); // percent

  const chartRef = useRef(null);
  const equityRef = useRef(null);
  const chartInstance = useRef(null);
  const candleSeriesRef = useRef(null);
  const equityInstance = useRef(null);

  // --- Generate realistic mock data ---
  const generateMockData = () => {
    const start = parseISO(fromDate);
    const end = parseISO(toDate);
    const generatedData = [];
    let currentDate = start;

    let currentPrice = asset === "Gold/USD" ? 2000 :
                       asset === "Silver/USD" ? 25 :
                       80; // Oil/USD

    while (currentDate <= end) {
      const open = currentPrice;
      const move = (Math.random() - 0.5) * 0.08 * currentPrice; // ±4%
      const close = +(open + move).toFixed(2);
      const high = Math.max(open, close) + +(Math.random() * 0.02 * currentPrice).toFixed(2);
      const low = Math.min(open, close) - +(Math.random() * 0.02 * currentPrice).toFixed(2);

      generatedData.push({ time: format(currentDate, "yyyy-MM-dd"), open, high, low, close });
      currentPrice = close;
      currentDate = addDays(currentDate, 1);
    }

    setData(generatedData);
    setTrades([]);
  };

  // --- Run backtest ---
  const runBacktest = async () => {
    if (!data.length) return;

    const res = await fetch("/api/backtest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, strategy, startingCapital, riskPerTrade }),
    });

    const json = await res.json();
    setTrades(json.trades || []);
  };

  // --- Candlestick chart ---
  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    if (chartInstance.current) {
      try { chartInstance.current.remove(); } catch {}
      chartInstance.current = null;
      candleSeriesRef.current = null;
    }

    const chart = createChart(chartRef.current, {
      width: chartRef.current.clientWidth,
      height: 400,
      layout: { backgroundColor: "#f9fafb", textColor: "#333" },
      grid: { vertLines: { color: "#eee" }, horzLines: { color: "#eee" } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });

    const candleSeries = chart.addCandlestickSeries();
    candleSeries.setData(data);
    chartInstance.current = chart;
    candleSeriesRef.current = candleSeries;

    if (trades.length) {
      const markers = trades.map(t => ({
        time: t.time,
        position: t.pnl >= 0 ? "aboveBar" : "belowBar",
        color: t.pnl >= 0 ? "green" : "red",
        shape: t.action === "BUY" ? "arrowUp" : "arrowDown",
        text: `$${t.pnl.toFixed(2)}`,
      }));
      candleSeries.setMarkers(markers);
    }

    const handleResize = () => {
      if (chartRef.current && chartInstance.current) {
        chartInstance.current.applyOptions({ width: chartRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      try { chart.remove(); } catch {}
      window.removeEventListener("resize", handleResize);
    };
  }, [data, trades]);

  // --- Equity curve with dynamic colors ---
  useEffect(() => {
    if (!equityRef.current || !trades.length) return;

    if (equityInstance.current) {
      try { equityInstance.current.remove(); } catch {}
      equityInstance.current = null;
    }

    const equityChart = createChart(equityRef.current, {
      width: equityRef.current.clientWidth,
      height: 350,
      layout: { backgroundColor: "#fff", textColor: "#333" },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
    });

    let cumulative = startingCapital;
    const equityData = trades.map(t => {
      cumulative += t.pnl;
      return { time: t.time, value: +cumulative.toFixed(2) };
    });

    const seriesList = [];
    let prev = equityData[0];
    let tempPoints = [prev];
    equityData.slice(1).forEach(curr => {
      if ((curr.value - prev.value >= 0 && tempPoints[tempPoints.length - 1].value <= prev.value) ||
          (curr.value - prev.value < 0 && tempPoints[tempPoints.length - 1].value > prev.value)) {
        const color = prev.value < tempPoints[tempPoints.length - 1].value ? "red" : "green";
        const s = equityChart.addLineSeries({ color });
        s.setData([...tempPoints]);
        seriesList.push(s);
        tempPoints = [prev];
      }
      tempPoints.push(curr);
      prev = curr;
    });
    // Last segment
    const lastColor = tempPoints[0].value < tempPoints[tempPoints.length - 1].value ? "green" : "red";
    const lastSeries = equityChart.addLineSeries({ color: lastColor });
    lastSeries.setData([...tempPoints]);
    seriesList.push(lastSeries);

    equityInstance.current = equityChart;

    const handleResize = () => {
      if (equityRef.current && equityInstance.current) {
        equityInstance.current.applyOptions({ width: equityRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      try { equityChart.remove(); } catch {}
      window.removeEventListener("resize", handleResize);
    };
  }, [trades, startingCapital]);

  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winRate = trades.length ? (trades.filter(t => t.pnl > 0).length / trades.length) * 100 : 0;

  return (
    <div style={{ maxWidth: 1200, margin: "2rem auto", fontFamily: "Inter, sans-serif", padding: "1rem", background: "#fff", borderRadius: "12px", boxShadow: "0 4px 8px rgba(0,0,0,0.05)" }}>
      <h1 style={{ textAlign: "center", marginBottom: "1rem" }}>Algorithmic Backtester</h1>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <select value={asset} onChange={e => setAsset(e.target.value)}>
          <option>Gold/USD</option>
          <option>Silver/USD</option>
          <option>Oil/USD</option>
        </select>

        <select value={strategy} onChange={e => setStrategy(e.target.value)}>
          <option value="TWAP">TWAP</option>
          <option value="VWAP">VWAP</option>
          <option value="ICEBERG">Iceberg</option>
        </select>

        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        <input type="number" value={startingCapital} onChange={e => setStartingCapital(parseFloat(e.target.value))} placeholder="Starting Capital" />
        <input type="number" value={riskPerTrade} onChange={e => setRiskPerTrade(parseFloat(e.target.value))} placeholder="Risk per Trade (%)" step="0.1" />

        <button onClick={generateMockData} style={{ padding: "6px 12px", background: "#0366d6", color: "#fff" }}>Load Data</button>
        <button onClick={runBacktest} style={{ padding: "6px 12px", background: "#28a745", color: "#fff" }}>Run Backtest</button>
      </div>

      <div ref={chartRef} style={{ marginTop: 16, width: "100%", height: 400 }} />

      <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 50%", minWidth: 300 }}>
          <h3>Equity Curve</h3>
          <div ref={equityRef} style={{ width: "100%", height: 350 }} />
        </div>

        <div style={{ flex: "1 1 50%", minWidth: 300 }}>
          <h3>Summary ({strategy})</h3>
          <div>Total Trades: {trades.length}</div>
          <div>Total PnL: ${totalPnL.toFixed(2)}</div>
          <div>Win Rate: {winRate.toFixed(2)}%</div>

          {trades.length > 0 && (
            <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Time</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Action</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>PnL</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t, i) => (
                  <tr key={i}>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>{t.time}</td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>{t.action}</td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>${t.pnl.toFixed(2)}</td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>{t.pnl >= 0 ? "Win" : "Loss"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
