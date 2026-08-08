<img style="width: 128px; height: 128px" src="website/static/favicon.svg" /><h1 style="font-size: 48px">Rugplay v2</h1>

**A full rework of [Rugplay](https://rugplay.com), the fake crypto trading simulator.**

[Original project](https://github.com/outpoot/rugplay) | [License](LICENSE)

## About

Rugplay v2 is a fork of [outpoot/rugplay](https://github.com/outpoot/rugplay) that I'm slowly tearing apart and rebuilding into my own thing. The original is a realistic crypto trading simulator where you can create coins, trade against liquidity pools, and get rugged, all with zero real money on the line.

This started as "I'll just add one feature" and has since turned into a full v2. New systems, rewritten old ones, stuff bolted on that was never part of the original plan. It's a solo, self directed project I work on whenever I feel like it, so don't expect a changelog or a roadmap, just expect it to keep changing.

## What's new here that wasn't in upstream

- 📰 **AI news feed.** Market stuff (trades, new coin launches, prediction markets resolving, rug pulls) actually gets written up into news articles now. An AI writes them first, and if that fails or times out for whatever reason it quietly falls back to a template writer so the feed never just goes silent. Articles pull a cover image automatically (coin icon, someone's avatar, or a themed stock photo), and you can react to them, report them, or share them out.
- 🎲 **Arcade keeps growing.** Coinflip, Dice, Slots, Tower, Mines, all still there, and new games get added on top following the same server side RNG and house edge rules as everything else so nothing's client trusted.
- ☁️ **Vercel support.** Added the Vercel adapter so this can be deployed there directly, on top of the existing Docker setup.
- 🔧 A bunch of stuff under the hood has been rewritten too, the AMM engine, the db schema, the job scheduler, the websocket layer, mostly invisible to users but it's there.

This list will go stale, honestly. The code's the real source of truth at this point.

## Everything else, from upstream

- 🪙 Create coins
- 🟢 Buy coins
- 🔴 Sell coins
- ⚖️ Predict on questions, kind of like Polymarket
- 🎲 Arcade games
- 📰 News feed
- 📊 Treemap of the whole market
- 🏆 Leaderboards

![Preview 2](github_assets/preview2.png)
![Preview](github_assets/preview.png)

## Stack

- SvelteKit + TypeScript for frontend and backend
- PostgreSQL with Drizzle ORM
- Redis for caching and pub/sub
- A standalone Bun websocket server for realtime stuff
- Backblaze B2 for storage
- Polar.sh for payments
- OpenRouter for the AI bits

## Heads up

This is a personal project that's very much in progress, not a finished product, and I'm not affiliated with the original Rugplay team in any official capacity. If you want the stable version, go use [outpoot/rugplay](https://github.com/outpoot/rugplay) or just visit [rugplay.com](https://rugplay.com).

## License

Same license as upstream, Creative Commons Attribution NonCommercial 4.0 International (CC BY NC 4.0). Check [LICENSE](LICENSE) for the actual terms.
