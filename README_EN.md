# BSV Simple -- Coding Challenges

## Overview

These challenges test whether developers with **no prior BSV SDK knowledge** can build complete, production-quality business solutions using only the `@bsv/simple` library and a BSV Desktop Wallet.

Each challenge presents a realistic business scenario. You must design, build, and ship a working Next.js application that solves the problem end-to-end. The only blockchain tool at your disposal is `@bsv/simple` -- no raw SDK calls, no manual script construction, no low-level transaction building.

## Prerequisites

- **Node.js 18+** (LTS recommended)
- **BSV Desktop Wallet** -- download from [desktop.bsvb.tech](https://desktop.bsvb.tech/)
- **Basic Next.js / React knowledge** -- component state, API routes, Tailwind CSS
- A funded BSV Desktop Wallet (testnet or mainnet)

## The Challenges

| # | Challenge | Difficulty | Time Estimate | Modules Used |
|---|-----------|------------|---------------|--------------|
| 1 | [Proof of Receipt](./01-proof-of-receipt/) | Easy | 2--4 hours | Tokens, Inscriptions |
| 2 | [Peer Tip Jar](./02-peer-tip-jar/) | Intermediate | 4--8 hours | MessageBox, DID, Payments |
| 3 | [Verified Freelancer Marketplace](./03-verified-freelancer-marketplace/) | Hard | 8--16 hours | All modules |

### Challenge 1: Proof of Receipt (Easy)

A store wants tamper-proof digital receipts on the blockchain. Build a Next.js app with a product catalog where each purchase creates a token the customer owns, with the receipt data inscribed as JSON. Browser-only -- no server code needed.

### Challenge 2: Peer Tip Jar (Intermediate)

Build a peer-to-peer tip jar where users register a handle, discover other users by name, and send satoshi tips via MessageBox. Requires a browser client plus two API routes (identity registry and DID resolution).

### Challenge 3: Verified Freelancer Marketplace (Hard)

A full-stack marketplace where freelancers acquire verifiable credentials, post service listings via overlay, and clients pay for services with escrowed tokens. Uses every module in the library: tokens, inscriptions, MessageBox, DID, credentials, certification, overlay, and server wallet.

## Rules

1. **Use only `@bsv/simple` documentation** -- do not use the raw `@bsv/sdk` API directly. The goal is to validate that the simplified API is sufficient for real-world applications.
2. **BSV Desktop Wallet for signing** -- all transaction signing must go through the desktop wallet via `createWallet()`.
3. **Solutions must be Next.js apps** -- use the App Router, Tailwind CSS for styling, and TypeScript throughout.
4. **No copy-pasting from the reference solutions** -- you may read them after completing the challenge to compare approaches, but not during.
5. **You may reference the library documentation** at any time.

## Scoring

| Criteria | Weight | Description |
|----------|--------|-------------|
| **Functionality** | 60% | All acceptance criteria met, features work correctly, transactions confirm on-chain |
| **Code Quality** | 20% | Clean TypeScript, proper error handling, good component structure, no lint warnings |
| **User Experience** | 20% | Loading states, error messages, responsive layout, intuitive flow |

## Documentation

Full library documentation is available in the guides directory:

- `simplifier-v2/docs/guides/browser-wallet.md` -- Wallet connection and core methods
- `simplifier-v2/docs/guides/tokens.md` -- Token creation, listing, transfer, and redemption
- `simplifier-v2/docs/guides/inscriptions.md` -- On-chain text, JSON, and hash inscriptions
- `simplifier-v2/docs/guides/messagebox.md` -- P2P messaging and payments via MessageBox
- `simplifier-v2/docs/guides/did.md` -- Decentralized Identifiers (DID)
- `simplifier-v2/docs/guides/credentials.md` -- Verifiable Credentials (W3C VC/VP)
- `simplifier-v2/docs/guides/certification.md` -- Certificate issuance and management
- `simplifier-v2/docs/guides/overlay.md` -- SHIP/SLAP overlay network
- `simplifier-v2/docs/guides/payments.md` -- Payment flows and change recovery
- `simplifier-v2/docs/guides/server-wallet.md` -- Server-side wallet operations
- `simplifier-v2/docs/guides/nextjs-integration.md` -- Next.js configuration and patterns

## Structure

Each challenge folder contains:

```
challenges/
  01-proof-of-receipt/
    README_EN.md          # Challenge spec (English)
    README_ES.md          # Challenge spec (Spanish)
    solution/             # Reference implementation
      app/
        page.tsx          # Main solution code
        layout.tsx
        globals.css
      package.json
      next.config.ts
      tsconfig.json
      postcss.config.mjs

  02-peer-tip-jar/
    README_EN.md
    README_ES.md
    solution/
      ...

  03-verified-freelancer-marketplace/
    README_EN.md
    README_ES.md
    solution/
      ...
```

## Getting Started

1. Pick a challenge that matches your experience level.
2. Read the challenge spec (`README_EN.md` or `README_ES.md` in the challenge folder).
3. Create a new Next.js project in your workspace (or copy the `solution/` skeleton and clear `page.tsx`).
4. Build your solution using only the `@bsv/simple` docs.
5. When finished, compare your approach with the reference implementation in `solution/`.

Good luck!
