# Challenge 3: Verified Freelancer Marketplace

**Difficulty:** Hard | **Estimated Time:** 8--16 hours | **Modules:** All (Credentials, DID, MessageBox, Server Wallet, Payments, Tokens)

---

## Business Scenario

An organization issues **verifiable credentials** to verified freelancers. Clients can search the freelancer directory by handle, view their credentials, and pay them directly via MessageBox. The organization runs a **server wallet** that funds credential issuance. Freelancers create **DIDs** for decentralized identity.

## What You'll Build

A **full-stack Next.js application** with:

1. **Admin Panel** -- Create a server wallet, fund it from the desktop wallet, and issue credentials to freelancers.
2. **Freelancer Flow** -- Connect wallet, register a handle, acquire a credential from the issuer, create a DID.
3. **Client Flow** -- Search freelancers by handle, view their credentials, and send payment via MessageBox.
4. **Freelancer Inbox** -- List and accept incoming payments.
5. **4 API Routes**: `credential-issuer`, `server-wallet`, `identity-registry`, `resolve-did`.

## Testing Flow

You will need **three browser profiles** (or three separate BSV Desktop Wallets) to test the full flow:

1. **Admin**: Create and fund the server wallet.
2. **Freelancer**: Connect, register as `@alice-dev`, acquire credential (name, skill, rate).
3. **Admin**: Verify credential was issued (issuer info endpoint).
4. **Client**: Search `@alice-dev`, view credential, send 5000 sat payment.
5. **Freelancer**: Check inbox, accept payment.
6. **Freelancer**: Create DID, resolve it.
7. **Admin**: Revoke credential if needed.

## Requirements

### 1. Server Wallet Creation and Funding

```typescript
// Server side
const { ServerWallet } = await import('@bsv/simple/server')
const wallet = await ServerWallet.create({ privateKey, network: 'main', storageUrl: 'https://storage.babbage.systems' })

// Client side: fund the server wallet
const result = await wallet.fundServerWallet(paymentRequest, 'marketplace-funding', 'recovered-change')
```

### 2. Credential Schema Definition

```typescript
import { CredentialSchema } from '@bsv/simple/browser'

const schema = new CredentialSchema({
  id: 'freelancer-verified',
  name: 'VerifiedFreelancer',
  description: 'Verified freelancer credential for the marketplace',
  fields: [
    { key: 'name', label: 'Full Name', type: 'text', required: true },
    { key: 'skill', label: 'Primary Skill', type: 'select', required: true, options: [
      { value: 'web-dev', label: 'Web Development' },
      { value: 'mobile-dev', label: 'Mobile Development' },
      { value: 'design', label: 'UI/UX Design' },
      { value: 'backend', label: 'Backend Engineering' },
      { value: 'devops', label: 'DevOps' },
      { value: 'data', label: 'Data Science' },
    ]},
    { key: 'rate', label: 'Hourly Rate (sats)', type: 'number', required: true },
    { key: 'bio', label: 'Bio', type: 'textarea' },
  ]
})
```

### 3. Credential Issuer Setup

```typescript
import { CredentialIssuer } from '@bsv/simple/browser'
import { FileRevocationStore, ServerWallet } from '@bsv/simple/server'

const issuer = await CredentialIssuer.create({
  privateKey,
  schemas: [schema.getConfig()],
  revocation: {
    enabled: true,
    wallet: serverWallet.getClient(),
    store: new FileRevocationStore('.revocation-secrets.json'),
  }
})
```

### 4. Credential Issuance API Endpoint

```
POST /api/credential-issuer?action=issue
Body: { subjectKey, schemaId, fields: { name, skill, rate, bio } }
```

### 5. Wallet Acquires Credential

```typescript
const vc = await wallet.acquireCredential({
  serverUrl: '/api/credential-issuer',
  schemaId: 'freelancer-verified',
  fields: { name: 'Alice', skill: 'web-dev', rate: '50000', bio: 'Full-stack developer' },
  replaceExisting: true
})
```

### 6. List Credentials

```typescript
const vcs = await wallet.listCredentials({
  certifiers: [issuerPublicKey],
  types: [certificateTypeBase64]
})
```

### 7. Create Presentation

```typescript
const vp = wallet.createPresentation(credentials)
```

### 8. Handle Registration

```typescript
await wallet.certifyForMessageBox('@alice-dev', '/api/identity-registry')
```

### 9. Handle Search

```typescript
const results = await wallet.lookupIdentityByTag('alice', '/api/identity-registry')
```

### 10. Send Payment via MessageBox

```typescript
await wallet.sendMessageBoxPayment(recipientKey, 5000, 'recovered-change')
```

### 11. List and Accept Incoming Payments

```typescript
const payments = await wallet.listIncomingPayments()
await wallet.acceptIncomingPayment(payments[0], 'freelancer-earnings')
```

### 12. Create and Resolve DIDs

```typescript
const { did } = await wallet.createDID()
const result = await wallet.resolveDID(did)
```

## API Routes

| Route | Purpose |
|-------|---------|
| `/api/server-wallet` | Server wallet -- create, fund, balance, outputs, reset |
| `/api/credential-issuer` | Credential issuer -- info, schema, issue, verify, revoke, status |
| `/api/identity-registry` | Tag/handle registry -- register, lookup, list, revoke handles |
| `/api/resolve-did` | DID resolution proxy -- resolves `did:bsv:*` identifiers server-side |

## Acceptance Criteria

- [ ] Server wallet created and funded
- [ ] Credential schema validates input
- [ ] Credentials can be issued to freelancers
- [ ] Freelancers can acquire credentials
- [ ] Credentials can be listed and displayed
- [ ] Presentations can be created
- [ ] Handle registration and search work
- [ ] P2P payments work via MessageBox
- [ ] Inbox shows and accepts payments
- [ ] DIDs can be created and resolved

## Bonus Points

- Credential revocation from admin panel
- Server wallet balance display
- Credential verification (verify a VC's validity)
- Nice multi-tab UI separating admin, freelancer, and client roles
- Activity log / results panel

## Hints

- Read **all** the library guides: `credentials.md`, `server-wallet.md`, `messagebox.md`, `did.md`, `payments.md`, `browser-wallet.md`, `nextjs-integration.md`.
- This is a **full-stack** challenge. The credential-issuer API route is the most complex piece.
- The `acquireCredential()` method on the wallet communicates with the credential-issuer server endpoint automatically.
- For `listCredentials()`, you need the issuer's `publicKey` and the schema's `certificateTypeBase64` -- fetch these from `/api/credential-issuer?action=info` first.
- The server wallet funds the issuer's revocation UTXOs. Fund the server wallet before issuing credentials with revocation enabled.
- Use `FileRevocationStore` on the server for persistent revocation secrets.
- `certifyForMessageBox` does three things in one call: creates a certificate, registers the handle, and anoints the MessageBox host.

## Getting Started

```bash
cd challenges/03-verified-freelancer-marketplace/solution
npm install
npx next dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Make sure BSV Desktop Wallet is running.

## Documentation References

- `simplifier-v2/docs/guides/credentials.md` -- Verifiable Credentials
- `simplifier-v2/docs/guides/server-wallet.md` -- Server Wallet
- `simplifier-v2/docs/guides/messagebox.md` -- P2P Messaging & Payments
- `simplifier-v2/docs/guides/did.md` -- Decentralized Identifiers
- `simplifier-v2/docs/guides/payments.md` -- Payment Flows
- `simplifier-v2/docs/guides/browser-wallet.md` -- Wallet Connection
- `simplifier-v2/docs/guides/nextjs-integration.md` -- Next.js Configuration
