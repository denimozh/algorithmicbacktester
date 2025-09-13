
# Algorithmic Backtester – FICC & Commodities

A **front-end algorithmic trading backtester** simulating different execution strategies (TWAP, VWAP, ICEBERG) on commodities and FX assets. Designed for learning, prototyping, and CV demonstration in FICC and Commodities trading.

**Live Project:** [https://algorithmicbacktester-nli9.vercel.app/](https://algorithmicbacktester-nli9.vercel.app/)

---

## Features

- Realistic **mock price data** generation for Gold/USD, Silver/USD, and Oil/USD.
- Execution of multiple **trading strategies**: TWAP, VWAP, ICEBERG.
- **Risk-per-trade scaling** in user-friendly percentage inputs.
- **Candlestick chart** visualization of historical price data.
- **Equity curve** dynamically colored for profit/loss moves.
- **Trade summary table** with PnL, action, and result.
- Responsive chart sizing and equity curve plotting.
- Completely **frontend-driven**, no real API required.

---

## Mock Data Generation

- Price data is **generated daily** for a chosen date range.
- **Starting prices**:  
  - Gold/USD = 2000  
  - Silver/USD = 25  
  - Oil/USD = 80
- **Daily price moves** are random ±4% of the previous close.  
- **High/Low** are calculated ±2% of the close to simulate realistic intraday ranges.  

**Example data point structure:**

```json
{
  "time": "2024-03-01",
  "open": 2000,
  "high": 2040,
  "low": 1980,
  "close": 2025
}
````

---

## Trading Strategies

### 1. TWAP (Time-Weighted Average Price)

* Executes trades **evenly across all days** in the selected period.
* Reduces market impact by spreading orders.
* Each trade risks a fixed **percentage of available capital**.

### 2. VWAP (Volume-Weighted Average Price)

* Executes trades in **fewer slices** (approx. half the days), concentrating on heavier days.
* Simulates prioritization of volume-heavy periods.
* Risk per trade is adjusted per slice, maintaining user-specified percentage.

### 3. ICEBERG

* Executes trades in **even fewer, larger slices**, mimicking hidden large orders.
* Has **slightly higher simulated slippage** to represent market impact.
* Uses a larger fraction of capital per slice while respecting risk-per-trade input.

---

## Risk and PnL Calculations

* User inputs **risk per trade** as a percentage (e.g., 2 = 2% of capital).
* **Quantity per trade**:

  ```
  qty = capital * riskPerTrade / price
  ```
* **Simulated slippage**:

  ```
  slippage = (Math.random() - 0.5) * 0.002 * price * strategyFactor
  ```

  * `strategyFactor = 2` for ICEBERG, `1` otherwise.
* **PnL per trade**:

  ```
  BUY:  pnl = (marketPrice - executionPrice) * qty
  SELL: pnl = (executionPrice - marketPrice) * qty
  ```
* **Cumulative capital** is updated after each trade to simulate compounding.

---

## Charts

### Candlestick Chart

* Displays **mock historical price data**.
* Marks trades using **colored arrows**:

  * Green arrowUp = profitable BUY
  * Red arrowDown = losing SELL
  * Custom colors per strategy:

    * TWAP: green/red
    * VWAP: cyan/orange
    * ICEBERG: purple/pink

### Equity Curve

* Shows **cumulative capital over time**.
* Each segment colored:

  * **Green** = positive move
  * **Red** = negative move
* Updates dynamically based on executed trades.

---

## Trade Summary Table

Displays:

| Time       | Action | PnL      | Result |
| ---------- | ------ | -------- | ------ |
| 2024-03-01 | BUY    | \$45.00  | Win    |
| 2024-03-03 | SELL   | -\$30.00 | Loss   |

Provides **clear insight into trade outcomes** and supports analysis of strategy performance.

---

## Usage

1. **Load Mock Data**

   * Select **asset**, **strategy**, **date range**, **starting capital**, and **risk per trade**.
   * Click **Load Data**.

2. **Run Backtest**

   * Click **Run Backtest** to simulate trades using the selected strategy.
   * View trades on the candlestick chart and cumulative equity on the equity curve.

3. **Analyze Results**

   * Check the **trade summary table** for individual trade outcomes.
   * Observe **equity curve** to visualize strategy performance.

---

## Technical Stack

* **React** (Functional Components & Hooks)
* **lightweight-charts** for visualization
* **date-fns** for date manipulation
* Fully **frontend mock backtester** – no external APIs required

---

