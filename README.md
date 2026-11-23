# btc-race-0511-dip-bot

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/Hambaliii/btc-race-0511-dip-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/Hambaliii/btc-race-0511-dip-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

Dip-buy mean-reversion bot for Coinbase Wrapped BTC (cbBTC): buys a measured 1% pullback from the rolling 60-minute high after a reclaim from the 30-minute low, sells at +2% or a hard -3.5% disaster stop, at most 3 round trips per 24 hours. Paper money only — no real funds trade.

## Run it

```sh
node cli/makefun.mjs grade-local --kit <path-to-kit> --bot . --driver process
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=jjjfbbvm&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>
