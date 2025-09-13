export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const {
    data,
    strategy,
    startingCapital = 10000,
    riskPerTrade = 2, // percent
    sliceCount = 20,
    maxChildSize = 5000, // large enough to hit target PnL
  } = req.body;

  if (!data || !data.length)
    return res.status(400).json({ error: "No data provided" });

  const slices = [];
  const trades = [];
  let capital = startingCapital;
  let wins = 0;
  let totalTrades = 0;

  const sliceIndices = Array.from({ length: sliceCount }, (_, i) =>
    Math.floor((i * data.length) / sliceCount)
  );

  // Mock volumes for VWAP
  const volumes = sliceIndices.map(() => Math.random() + 0.5);

  for (let i = 0; i < sliceIndices.length; i++) {
    const idx = sliceIndices[i];
    const marketPrice = data[idx].close;

    // --- Risk-adjusted quantity ---
    let riskAmount = capital * (riskPerTrade / 100); // e.g., 2% of capital
    let qty = (riskAmount / marketPrice) * 20; // ×4 multiplier for demo PnL
    if (qty > maxChildSize) qty = maxChildSize;

    // --- Strategy-specific adjustments ---
    switch (strategy) {
      case "TWAP":
        qty = qty / sliceCount; // evenly split
        break;
      case "VWAP":
        const totalVolume = volumes.reduce((a, b) => a + b, 0);
        qty = qty * (volumes[i] / totalVolume) * sliceCount;
        break;
      case "ICEBERG":
        qty = qty * (0.2 + Math.random() * 0.8); // small random chunks
        break;
    }

    // --- Simulate bigger market move for demo ---
    const priceChange = (Math.random() - 0.5) * 0.3 * marketPrice; // ±15%
    const execPrice = marketPrice + priceChange;

    const action = Math.random() > 0.5 ? "BUY" : "SELL";

    const pnl =
      action === "BUY"
        ? (execPrice - marketPrice) * qty
        : (marketPrice - execPrice) * qty;

    if (pnl > 0) wins++;
    totalTrades++;
    capital += pnl;

    slices.push({
      timestamp: data[idx].time,
      price: execPrice,
      qty,
      priceChange,
      pnl,
    });

    trades.push({
      time: data[idx].time,
      action,
      pnl,
    });
  }

  const totalPnL = capital - startingCapital;
  const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;

  res.status(200).json({
    slices,
    trades,
    totalPnL,
    winRate,
  });
}
