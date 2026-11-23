// btc-race-24h-20261123-0511 — dip-buy mean-reversion bot (CBBTC/USDC, 1m bars).
// Strategy: buy the dip with full size when close is >=1.00% below the rolling
// 60-bar high AND >=0.10% reclaimed above the rolling 30-bar low on an uptick
// (close > prevClose). Exit at take-profit +2% or disaster stop -3.5% from the
// entry price (fill price, with a cost-basis fallback). Max 3 round trips,
// one order per batch, pending-order guards so no duplicate buy/sell is sent
// while a previous order is unfilled. No trailing stop, no other entries.
// Dev-window result (grade-local, 1440-bar dev set, $1,000 paper):
// net PnL +27.552579 USDC, 3 trades, win rate 1.0, deterministic
// (L1 regrade reproduced byte for byte).
import { runBars } from './vendor/makefun-bars.ts';

const highs: bigint[] = [];
const lows: bigint[] = [];
let prevClose: bigint | null = null;
let entryPrice: bigint | null = null;
let trips = 0;
let pendingBuy = false;
let pendingSell = false;

await runBars({
  onBatch(state, batch) {
    for (const fill of batch.fills) {
      if (fill.side === 'buy') {
        if (fill.status === 'filled') {
          entryPrice = BigInt(fill.price);
          pendingBuy = false;
        } else if (fill.status === 'rejected') {
          pendingBuy = false;
        }
      } else if (fill.side === 'sell') {
        if (fill.status === 'filled') {
          trips += 1;
          entryPrice = null;
          pendingSell = false;
        } else if (fill.status === 'rejected') {
          pendingSell = false;
        }
      }
    }

    if (state.warmingUp) {
      return [];
    }

    let bar = null;
    for (const b of batch.bars) {
      if (b.symbol === 'CBBTC') {
        bar = b;
        break;
      }
    }
    if (bar === null) {
      return [];
    }

    highs.push(BigInt(bar.h));
    lows.push(BigInt(bar.l));
    const close = BigInt(bar.c);

    let orders = [];

    const pos = state.positions.get('CBBTC');
    const holding = pos !== undefined && pos.qty > 0n;

    if (holding) {
      let effectiveEntry: bigint | null = entryPrice;
      if (effectiveEntry === null && pos.cost > 0n && pos.qty > 0n) {
        effectiveEntry = (pos.cost * 10_000_000n) / pos.qty;
        entryPrice = effectiveEntry;
      }
      if (effectiveEntry !== null && !pendingSell) {
        if (close * 100n >= effectiveEntry * 102n) {
          orders = [{ side: 'sell', symbol: 'CBBTC', qty: pos.qty, max_slippage_bps: 500, client_id: 'sell' + (trips + 1) }];
          pendingSell = true;
        } else if (close * 1000n <= effectiveEntry * 965n) {
          orders = [{ side: 'sell', symbol: 'CBBTC', qty: pos.qty, max_slippage_bps: 500, client_id: 'sell' + (trips + 1) }];
          pendingSell = true;
        }
      }
    } else if (trips < 3 && !pendingBuy) {
      let high60 = 0n;
      const hStart = highs.length > 60 ? highs.length - 60 : 0;
      for (let i = hStart; i < highs.length; i++) {
        if (highs[i] > high60) {
          high60 = highs[i];
        }
      }
      let low30: bigint | null = null;
      const lStart = lows.length > 30 ? lows.length - 30 : 0;
      for (let i = lStart; i < lows.length; i++) {
        if (low30 === null || lows[i] < low30) {
          low30 = lows[i];
        }
      }
      if (
        low30 !== null &&
        close * 100n <= high60 * 99n &&
        close * 1000n >= low30 * 1001n &&
        prevClose !== null &&
        close > prevClose &&
        state.cash >= 1_000_000n
      ) {
        orders = [{ side: 'buy', symbol: 'CBBTC', notional_quote_units: state.cash, max_slippage_bps: 500, client_id: 'buy' + (trips + 1) }];
        pendingBuy = true;
      }
    }

    prevClose = close;
    return orders;
  },
});
