<img style="width: 128px; height: 128px" src="website/static/favicon.svg" /><h1 style="font-size: 48px"><a href="https://rugplay.com">Rugplay.com</a> - the fake crypto simulator.</h1>

[Privacy Policy](https://rugplay.com/legal/privacy) | [Terms of Service](https://rugplay.com/legal/terms) | [License](LICENSE) | [YouTube video](https://rugplay.com)

## About

Rugplay is a realistic cryptocurrency trading simulator that lets you experience the risks and mechanics of decentralized exchanges without real financial consequences. Create coins, trade with liquidity pools, and learn about "rug pulls" in a... relatively safe environment :)

## Features
- 🪙 Create coins
- 🟢 Buy coins
- 🔴 Sell coins
- ⚖️ Bet on questions (similar to Polymarket)
- 🎲 Gamble it all
- 📊 View a Treemap graph of the entire market
- 🏆 Compete on leaderboards

![Preview 2](github_assets/preview2.png)
![Preview](github_assets/preview.png)

## Setup

### Quick Start with Demo Mode

For developers who want to preview the application without setting up Google OAuth:

1. Copy the environment file:

    ```bash
    cp website/.env.example website/.env
    ```

2. Enable demo mode in `website/.env`:

    ```bash
    DEMO_MODE=true
    PUBLIC_DEMO_MODE=true
    ```

3. Start with Docker (recommended):

    ```bash
    ./build.sh
    ```

4. The app will be available at http://localhost:3002
5. Click "Sign In" and use the "Continue as Demo User" button

### Production Setup

For production deployment with full Google OAuth:

1. Copy the environment file:

    ```bash
    cp website/.env.example website/.env
    ```

2. Edit `website/.env` with your actual values, especially:
   - Set `DEMO_MODE=false` and `PUBLIC_DEMO_MODE=false`
   - Add your Google OAuth credentials
   - Configure database and other services

3. Start with Docker (recommended):

    ```bash
    ./build.sh
    ```

4. The app will be available at http://localhost:3002

## Development

```bash
cd website
npm install
npm run dev
```

The development server runs on http://localhost:5173

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International** License (**CC BY-NC 4.0**). See the [LICENSE](LICENSE) file for details.