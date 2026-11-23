import { runBars } from './vendor/makefun-bars.ts';

function parseScaled(s: string): bigint {
  const dot = s.indexOf('.');
  if (dot === -1) return BigInt(s);
  const intPart = s.slice(0, dot);
  const fracPart = (s.slice(dot + 1) + '00000').slice(0, 5);
  const sign = intPart.startsWith('-') ? -1n : 1n;
  const absInt = intPart.startsWith('-') ? intPart.slice(1) : intPart;
  return sign * (BigInt(absInt === '' ? '0' : absInt) * 100000n + BigInt(fracPart));
}

const highs: bigint[] = [];
const lows: bigint[] = [];
let prevClose: bigint | null = null;
let entryPrice: bigint | null = null;
let trips = 0;
let pendingBuy = false;

await runBars({
  onBatch(state, batch) {
    for (const fill of batch.fills) {
      if (fill.symbol !== 'CBBTC') continue;
      if (fill.side === 'buy' && fill.status === 'filled') {
        entryPrice = parseScaled(fill.price);
        pendingBuy = false;
      } else if (fill.side === 'buy' && fill.status === 'rejected') {
        pendingBuy = false;
      } else if (fill.side === 'sell' && fill.status === 'filled') {
        trips += 1;
        entryPrice = null;
      }
    }

    if (state.warmingUp) return [];

    const bar =
      batch.bars.find((b) => (b as { symbol?: string }).symbol === 'CBBTC') ??
      (batch.bars.length > 0 && (batch.bars[0] as { symbol?: string }).symbol === undefined
        ? batch.bars[0]
        : undefined);
    if (bar === undefined) return [];

    const high = parseScaled(bar.h);
    const low = parseScaled(bar.l);
    const close = parseScaled(bar.c);
    highs.push(high);
    lows.push(low);

    const prev = prevClose;
    prevClose = close;

    const pos = state.positions.get('CBBTC');
    const holding = pos !== undefined && pos.qty > 0n;

    if (holding) {
      // Entry-price fallback: if no buy fill price was observed yet, derive
      // the entry from the position cost basis instead of waiting.
      const effectiveEntry =
        entryPrice !== null ? entryPrice : (pos.cost * 10_000_000n) / pos.qty;
      if (close * 100n >= effectiveEntry * 102n) {
        return [
          {
            side: 'sell',
            symbol: 'CBBTC',
            qty: pos.qty,
            max_slippage_bps: 500,
            client_id: 'sell' + (trips + 1),
          },
        ];
      } else if (close * 1000n <= effectiveEntry * 965n) {
        return [
          {
            side: 'sell',
            symbol: 'CBBTC',
            qty: pos.qty,
            max_slippage_bps: 500,
            client_id: 'sell' + (trips + 1),
          },
        ];
      }
      return [];
    }

    if (!holding && trips < 3 && !pendingBuy) {
      let high60 = highs[highs.length - 1];
      const start60 = highs.length > 60 ? highs.length - 60 : 0;
      for (let i = start60; i < highs.length; i++) {
        if (highs[i] > high60) high60 = highs[i];
      }
      let low30 = lows[lows.length - 1];
      const start30 = lows.length > 30 ? lows.length - 30 : 0;
      for (let i = start30; i < lows.length; i++) {
        if (lows[i] < low30) low30 = lows[i];
      }
      if (
        close * 100n <= high60 * 99n &&
        close * 1000n >= low30 * 1001n &&
        prev !== null &&
        close > prev
      ) {
        if (state.cash < 1_000_000n) return [];
        pendingBuy = true;
        return [
          {
            side: 'buy',
            symbol: 'CBBTC',
            notional_quote_units: state.cash,
            max_slippage_bps: 500,
            client_id: 'buy' + (trips + 1),
          },
        ];
      }
    }

    return [];
  },
});
