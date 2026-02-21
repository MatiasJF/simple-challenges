# Challenge 2: Peer Tip Jar

**Difficulty:** Intermediate | **Estimated Time:** 4--8 hours | **Modules:** MessageBox, DID, Payments

---

## Business Scenario

Content creators want to receive direct peer-to-peer tips from fans. Creators register a human-readable handle so fans can find them and send tips directly -- no intermediary, no platform fee. Tips go through the MessageBox P2P system. Each creator also has a DID (Decentralized Identifier) for verifiable identity.

## What You'll Build

A Next.js application with the following features:

1. **Connect Wallet** + register a handle (`certifyForMessageBox`)
2. **Search creators** by handle (`lookupIdentityByTag`)
3. **Send tip** via MessageBox (`sendMessageBoxPayment`)
4. **Check inbox** for incoming tips (`listIncomingPayments`)
5. **Accept incoming tips** (`acceptIncomingPayment`)
6. **Create and resolve DIDs** (`createDID`, `resolveDID`)
7. **2 API routes**: identity registry + DID resolve proxy

## Testing Flow

You will need **two browser profiles** (or two separate BSV Desktop Wallets) to test the full flow:

1. **Wallet A**: Connect, certify as `@alice`
2. **Wallet B**: Connect, certify as `@bob`
3. **Wallet B**: Search for `@alice`, send a 1000 sats tip
4. **Wallet A**: Check inbox, accept the payment
5. **Both**: Create DIDs, resolve each other's DID

## Requirements

### 1. Connect Wallet

```typescript
const wallet = await createWallet({ didProxyUrl: '/api/resolve-did' })
```

### 2. Register Handle

```typescript
const result = await wallet.certifyForMessageBox(handle, '/api/identity-registry')
```

This performs a one-time MessageBox certification: it creates a certificate with the BSV Desktop Wallet, registers the handle in the identity registry, and anoints the MessageBox host so you can receive messages.

### 3. Search by Handle

```typescript
const results = await wallet.lookupIdentityByTag(query, '/api/identity-registry')
// Returns: [{ tag: string, identityKey: string }, ...]
```

### 4. Send Tip

```typescript
const result = await wallet.sendMessageBoxPayment(recipientKey, satoshis, 'recovered-change')
```

Sends a P2P payment via the MessageBox system. The `'recovered-change'` parameter ensures change outputs are reinternalized into a basket.

### 5. List Inbox

```typescript
const payments = await wallet.listIncomingPayments()
```

### 6. Accept Tip

```typescript
const result = await wallet.acceptIncomingPayment(payment, 'tips-received')
```

### 7. Create DID

```typescript
const result = await wallet.createDID()
// Returns: { did: 'did:bsv:<txid>', txid, identityCode, document }
```

### 8. Resolve DID

```typescript
const result = await wallet.resolveDID(didString)
// Returns: { didDocument, didDocumentMetadata, didResolutionMetadata }
```

## API Routes

You must create two server-side API routes:

| Route | Purpose |
|-------|---------|
| `/api/identity-registry` | Tag/handle registry -- register, lookup, list, revoke handles |
| `/api/resolve-did` | DID resolution proxy -- resolves `did:bsv:*` identifiers server-side |

## Acceptance Criteria

- [ ] Wallet connects successfully
- [ ] Handle registration works (certifyForMessageBox)
- [ ] Search finds registered creators by handle
- [ ] Tips can be sent P2P via MessageBox
- [ ] Inbox shows incoming tips
- [ ] Tips can be accepted and internalized
- [ ] DID can be created
- [ ] DID can be resolved

## Bonus Points

- Show the sender's name/handle on incoming tips
- Allow revoking a handle
- List all DIDs owned by the wallet
- Display tip history / activity log

## Hints

- Read the library guides: `messagebox.md`, `did.md`, `payments.md`
- Two API routes are needed -- the identity registry is a simple JSON file store, the DID proxy resolves against nChain's Universal Resolver with a WoC fallback
- `certifyForMessageBox` does three things in one call: creates a certificate, registers the handle, and anoints the MessageBox host
- Change outputs from `sendMessageBoxPayment` should use `'recovered-change'` basket
- `acceptIncomingPayment` takes a basket name for where to store the accepted funds

## Getting Started

```bash
cd challenges/02-peer-tip-jar/solution
npm install
npx next dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Make sure BSV Desktop Wallet is running.

## Documentation References

- `simplifier-v2/docs/guides/browser-wallet.md` -- Wallet connection
- `simplifier-v2/docs/guides/messagebox.md` -- P2P messaging and payments
- `simplifier-v2/docs/guides/did.md` -- Decentralized Identifiers
- `simplifier-v2/docs/guides/payments.md` -- Payment flows
- `simplifier-v2/docs/guides/nextjs-integration.md` -- Next.js configuration
