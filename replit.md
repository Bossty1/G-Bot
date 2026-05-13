# CryptoBot Dashboard

A professional-grade automated crypto trading bot platform with real-time dashboard, multi-chain wallet generation, paper trading mode, strategy management, and backtesting.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/trading-dashboard run dev` — run the frontend (port 24210)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + WebSocket (`ws`)
- DB: PostgreSQL + Drizzle ORM (7 tables: trades, wallets, strategies, exchanges, logs, backtests, settings)
- Frontend: React + Vite, Tailwind CSS, Recharts, TanStack Query, Wouter
- Wallet generation: ethers.js (EVM), @solana/web3.js (Solana)
- Encryption: AES via crypto-js (private keys encrypted at rest)
- Validation: Zod, drizzle-zod

## Where things live

- `lib/db/src/schema/` — Drizzle schema (source of truth for DB)
- `lib/api-spec/openapi.yaml` — OpenAPI spec
- `artifacts/api-server/src/routes/` — all API route handlers
- `artifacts/api-server/src/lib/` — botState, wallet, encryption, seed, id
- `artifacts/trading-dashboard/src/pages/` — all dashboard pages
- `artifacts/trading-dashboard/src/components/` — Sidebar, StatCard, BotControls
- `artifacts/trading-dashboard/src/hooks/useWebSocket.ts` — real-time bot status

## Architecture decisions

- API routes under `/api` prefix; WebSocket at `/api/ws` for proxy compatibility
- Private keys and API secrets AES-encrypted with SESSION_SECRET before DB storage
- Bot state is in-memory (singleton) with uptime timer; status broadcast via WebSocket every 5s
- Paper trading mode is default — live mode requires explicit opt-in
- Seed data auto-created on first boot (checks if trades table is empty)

## Product

- Dashboard: real-time PnL chart, bot controls (start/stop/pause), activity feed
- Trades: view all trades with open/close controls, win rate stats
- Strategies: create, activate/deactivate, view per-strategy stats
- Exchanges: add API keys (encrypted), test connections, view balances
- Wallets: generate multi-chain wallets (ETH/BSC/SOL/BTC/MATIC), copy addresses
- Backtests: run simulated strategy tests, view equity curves and metrics
- Logs: filterable live log feed with source and metadata
- Settings: risk management, notification config (Telegram/Discord)

## User preferences

- Dark crypto terminal theme (deep navy background, blue primary accent)
- Font mono for prices/numbers
- Paper trading as safe default

## Gotchas

- WebSocket path must be `/api/ws` (not `/ws`) to route through the shared proxy
- Drizzle schema changes require `pnpm --filter @workspace/db run push` + `pnpm run typecheck:libs`
- Never log sensitive data (private keys, API secrets) — they are always encrypted
- Bot state is in-memory only; restarting the server resets the bot to "stopped"
