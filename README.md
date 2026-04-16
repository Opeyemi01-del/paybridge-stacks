# paybridge-stacks
# PayBridge -- Bitcoin L2 Payment Gateway on Stacks

> Accept Bitcoin payments via sBTC. One API. Zero custody.

**Stacks Builder Rewards -- April 2026**

---

## What is PayBridge?

PayBridge lets any developer accept Bitcoin payments through sBTC on the
Stacks blockchain. Think Stripe, but for Bitcoin -- non-custodial,
on-chain, and open-source.

```bash
# Create a payment intent
curl -X POST https://api.paybridge.dev/v1/payments/create \
  -H "x-api-key: pb_YOUR_MERCHANT_YOUR_SECRET" \
  -d '{"amount_sats": 1000000, "memo": "Order #99", "private_key": "..."}'

# Response
{
  "payment_id": "pay_abc123",
  "amount_sats": 1000000,
  "fee_sats": 5000,
  "net_sats": 995000,
  "status": "pending",
  "expires_at": "2026-04-13T14:00:00Z"
}
```

---

## Architecture

```
Customer Wallet
      |
      | (sBTC transfer)
      v
[Clarity Smart Contract]  <-- trustless escrow on Stacks/Bitcoin
      |
      | (on-chain events)
      v
[PayBridge API]           <-- Node.js + Express REST API
      |
      | (webhooks)
      v
[Merchant Backend]        <-- your app gets notified instantly
```

---

## Project Structure

```
paybridge-stacks/
├── contracts/                    # Clarity smart contracts
│   ├── traits/sip-010-trait.clar
│   ├── mock-sbtc.clar
│   └── payment-gateway.clar      # Core escrow contract
├── tests/
│   └── payment-gateway.test.ts   # 25 passing tests
├── api/                          # Node.js REST API
│   └── src/
│       ├── index.ts
│       ├── routes/               # payments, merchants, webhooks, docs
│       ├── services/             # Stacks.js + event listener
│       ├── workers/              # BullMQ webhook delivery
│       └── db/                   # PostgreSQL schema + client
├── dashboard/                    # React merchant dashboard
│   └── src/
│       ├── pages/                # Overview, Payments, Webhooks, API Keys
│       └── components/
├── docs/
│   └── openapi.yaml              # Full OpenAPI 3.0 spec
├── deploy/
│   ├── DEPLOY.md                 # Railway + Render instructions
│   └── DEMO_SCRIPT.md            # Hackathon demo video script
└── settings/                     # Clarinet network configs
```

---

## Quick Start

### 1. Smart contracts (Hours 0-4)

```bash
# Install Clarinet
wget -nv https://github.com/hirosystems/clarinet/releases/download/v3.8.1/clarinet-linux-x64-glibc.tar.gz \
  -O clarinet.tar.gz && tar -xf clarinet.tar.gz && sudo mv clarinet /usr/local/bin

# Check contracts
clarinet check
# Output: 3 contracts checked

# Run 25 tests
npm install && npm test
# Output: 25 passed
```

### 2. API (Hours 4-16)

```bash
cd api
npm install
cp .env.example .env   # fill in your values
npm run dev
# API running at http://localhost:3001
```

### 3. Dashboard (Hours 16-22)

```bash
cd dashboard
npm install
npm run dev
# Dashboard at http://localhost:5173
```

### 4. Deploy (Hours 22-30)

See [deploy/DEPLOY.md](deploy/DEPLOY.md)

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | /health                        | -   | Health check |
| GET    | /v1/status                     | -   | Chain connectivity |
| POST   | /v1/merchants/register         | -   | Register merchant |
| GET    | /v1/merchants/:id              | -   | Get merchant |
| POST   | /v1/payments/create            | Key | Create payment |
| GET    | /v1/payments/:id               | -   | Get payment |
| GET    | /v1/payments/:id/status        | -   | Status check |
| POST   | /v1/payments/:id/release       | Key | Release funds |
| POST   | /v1/webhooks/register          | Key | Set webhook URL |
| GET    | /v1/webhooks/deliveries        | Key | Delivery history |
| POST   | /v1/webhooks/test              | Key | Send test event |

Interactive docs: http://localhost:3001/docs

---

## Smart Contract

The core contract `payment-gateway.clar` handles:

- Merchant registration (on-chain identity)
- Payment intent creation with 24-hour expiry
- sBTC escrow (funds held by contract, not us)
- 0.5% protocol fee (enforced on-chain)
- Merchant fund release
- Automatic fee accumulation

All logic is public, auditable, and runs on Bitcoin-secured Stacks.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contracts | Clarity 2, Stacks blockchain |
| Contract testing | Clarinet SDK, Vitest |
| API | Node.js, Express, TypeScript |
| Blockchain client | Stacks.js v6 |
| Job queue | BullMQ + Redis |
| Database | PostgreSQL |
| Dashboard | React 18, Vite |
| API docs | OpenAPI 3.0, Swagger UI |
| Deploy | Railway / Render |

---

## License

MIT# paybridge-stacks
