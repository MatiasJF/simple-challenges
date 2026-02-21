# Challenge 1: Proof of Receipt

**Difficulty:** Easy | **Estimated Time:** 2--4 hours | **Modules:** Tokens, Inscriptions

## Business Scenario

A store wants to give customers **tamper-proof digital receipts** stored on the blockchain. Each receipt is a token the customer owns, with the receipt data inscribed as JSON. The receipts cannot be altered or forged after creation, and the customer can view all their purchase history at any time.

## What You'll Build

A **browser-only** Next.js application with:

1. **Connect Wallet** -- A button that connects to the BSV Desktop Wallet using `createWallet()`.
2. **Product Catalog** -- A hardcoded list of 3--5 products, each with a name, price (in satoshis), and visual representation.
3. **Buy Button** -- When the user clicks "Buy" on a product, the app creates a token containing receipt data AND inscribes the full receipt as JSON on-chain, all in one flow.
4. **My Receipts** -- A section that lists all receipt tokens the user owns, with the decoded receipt data (product name, price, timestamp, transaction ID).

## Requirements

1. **Connect to BSV Desktop Wallet** using `createWallet()` from `@bsv/simple/browser`.
2. **Display a product catalog** with at least 3 products showing name, price in satoshis, and a visual indicator.
3. **When the user clicks "Buy":**
   - Create a receipt object containing: product name, price, timestamp (`ISO 8601`), and a buyer identifier (first 20 characters of the identity key).
   - Create a token with `wallet.createToken()` using the receipt object as `data` and `'receipts'` as the basket name.
   - Inscribe the full receipt as JSON using `wallet.inscribeJSON()` for a permanent, publicly verifiable on-chain record.
   - Display a success message with the transaction ID.
4. **List all receipt tokens** using `wallet.listTokenDetails('receipts')`, showing the decoded receipt data for each token.
5. **Handle errors gracefully** -- show meaningful error messages if wallet connection fails or transactions are rejected.

## Acceptance Criteria

- [ ] Wallet connects successfully via `createWallet()`
- [ ] Product catalog displays with at least 3 products
- [ ] Buying a product creates a token on-chain in the `'receipts'` basket
- [ ] Receipt JSON is inscribed on-chain via `inscribeJSON()`
- [ ] Receipts list shows all purchased items with decoded data (product, price, timestamp, outpoint)

## Bonus Points

- Polished UI with loading spinners and disabled button states during transactions
- Receipt detail view showing the full outpoint and transaction data
- Error boundary or toast notification system
- Responsive layout that works on mobile
- Visual confirmation animation after a successful purchase

## Hints

- Read `simplifier-v2/docs/guides/tokens.md` for `createToken()` and `listTokenDetails()`.
- Read `simplifier-v2/docs/guides/inscriptions.md` for `inscribeJSON()`.
- Read `simplifier-v2/docs/guides/browser-wallet.md` for `createWallet()` and `getIdentityKey()`.
- No server code is needed for this challenge. Everything runs in the browser.
- The `createToken()` method returns a `TokenResult` with a `txid` field.
- The `listTokenDetails()` method returns an array of `TokenDetail` objects, each with a `data` field containing the decrypted payload.

## Getting Started

```bash
cd challenges/01-proof-of-receipt/solution
npm install
npx next dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Make sure the BSV Desktop Wallet is running.

## API Reference (Quick Summary)

```typescript
// Connect wallet
import { createWallet } from '@bsv/simple/browser'
const wallet = await createWallet()

// Get identity key
const key = wallet.getIdentityKey() // '02abc...' (66 hex chars)

// Create a token
const result = await wallet.createToken({
  data: { product: 'Coffee', price: 500, timestamp: '2026-02-21T...' },
  basket: 'receipts'
})
// result.txid -> transaction ID

// Inscribe JSON
const inscription = await wallet.inscribeJSON({
  product: 'Coffee',
  price: 500,
  timestamp: '2026-02-21T...'
})
// inscription.txid -> transaction ID

// List tokens with decrypted data
const receipts = await wallet.listTokenDetails('receipts')
// [{ outpoint, satoshis, data: { product, price, timestamp } }, ...]
```
