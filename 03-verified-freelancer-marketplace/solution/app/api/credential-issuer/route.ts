/**
 * Credential Issuer API Route
 *
 * GET  ?action=info                           → Issuer info (publicKey, schemas)
 * GET  ?action=schema&id=<schemaId>           → Get schema details
 * POST ?action=issue    body: { subjectKey, schemaId, fields }  → Issue credential
 * POST ?action=verify   body: { credential }                   → Verify credential
 * POST ?action=revoke   body: { serialNumber }                 → Revoke credential
 * GET  ?action=status&serialNumber=<sn>       → Check revocation status
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrivateKey } from '@bsv/sdk'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const ISSUER_KEY_FILE = join(process.cwd(), '.credential-issuer-key.json')

let issuerInstance: any = null
let issuerInitPromise: Promise<any> | null = null

function loadIssuerKey(): string | null {
  try { if (existsSync(ISSUER_KEY_FILE)) return JSON.parse(readFileSync(ISSUER_KEY_FILE, 'utf-8')).privateKey } catch {}
  return null
}

function saveIssuerKey(privateKey: string, publicKey: string) {
  writeFileSync(ISSUER_KEY_FILE, JSON.stringify({ privateKey, publicKey }, null, 2))
}

async function getIssuer() {
  if (issuerInstance) return issuerInstance
  if (issuerInitPromise) return issuerInitPromise

  issuerInitPromise = (async () => {
    const { CredentialIssuer, CredentialSchema } = await import('@bsv/simple/browser')
    const { ServerWallet } = await import('@bsv/simple/server')
    const { FileRevocationStore } = await import('@bsv/simple')

    // Load or generate issuer key
    const savedKey = loadIssuerKey()
    const privateKey = process.env.CREDENTIAL_ISSUER_KEY || savedKey || PrivateKey.fromRandom().toHex()

    // Define the freelancer schema
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
      ],
      computedFields: (values) => ({
        ...values,
        verifiedAt: new Date().toISOString(),
        status: 'active',
      }),
    })

    // Try to get server wallet for revocation (optional — works without it)
    let revocationConfig: any = { enabled: false }
    try {
      // Check if server wallet exists
      const walletFile = join(process.cwd(), '.server-wallet.json')
      if (existsSync(walletFile)) {
        const walletData = JSON.parse(readFileSync(walletFile, 'utf-8'))
        if (walletData.privateKey) {
          const sw = await ServerWallet.create({ privateKey: walletData.privateKey, network: 'main', storageUrl: 'https://storage.babbage.systems' })
          revocationConfig = {
            enabled: true,
            wallet: sw.getClient(),
            store: new FileRevocationStore(join(process.cwd(), '.revocation-secrets.json')),
          }
        }
      }
    } catch {
      // Revocation not available — that's OK for demo
    }

    issuerInstance = await CredentialIssuer.create({
      privateKey,
      schemas: [schema.getConfig()],
      revocation: revocationConfig,
    })

    if (!process.env.CREDENTIAL_ISSUER_KEY) {
      saveIssuerKey(privateKey, issuerInstance.getInfo().publicKey)
    }

    return issuerInstance
  })()

  return issuerInitPromise
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || 'info'

  try {
    if (action === 'info') {
      const issuer = await getIssuer()
      const info = issuer.getInfo()
      return NextResponse.json({ success: true, ...info })
    }

    if (action === 'schema') {
      const issuer = await getIssuer()
      const id = req.nextUrl.searchParams.get('id') || 'freelancer-verified'
      const info = issuer.getInfo()
      const schema = info.schemas?.find((s: any) => s.id === id)
      if (!schema) return NextResponse.json({ success: false, error: `Schema "${id}" not found` }, { status: 404 })
      return NextResponse.json({ success: true, schema })
    }

    if (action === 'status') {
      const issuer = await getIssuer()
      const sn = req.nextUrl.searchParams.get('serialNumber')
      if (!sn) return NextResponse.json({ success: false, error: 'Missing serialNumber' }, { status: 400 })
      const revoked = await issuer.isRevoked(sn)
      return NextResponse.json({ success: true, serialNumber: sn, revoked })
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ success: false, error: `${action} failed: ${(error as Error).message}` }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')

  try {
    const body = await req.json()

    if (action === 'issue') {
      const { subjectKey, schemaId, fields } = body
      if (!subjectKey || !fields) return NextResponse.json({ success: false, error: 'Missing subjectKey or fields' }, { status: 400 })
      const issuer = await getIssuer()
      const vc = await issuer.issue(subjectKey, schemaId || 'freelancer-verified', fields)
      return NextResponse.json({ success: true, credential: vc })
    }

    if (action === 'verify') {
      const { credential } = body
      if (!credential) return NextResponse.json({ success: false, error: 'Missing credential' }, { status: 400 })
      const issuer = await getIssuer()
      const result = await issuer.verify(credential)
      return NextResponse.json({ success: true, verification: result })
    }

    if (action === 'revoke') {
      const { serialNumber } = body
      if (!serialNumber) return NextResponse.json({ success: false, error: 'Missing serialNumber' }, { status: 400 })
      const issuer = await getIssuer()
      const result = await issuer.revoke(serialNumber)
      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ success: false, error: `${action} failed: ${(error as Error).message}` }, { status: 500 })
  }
}
