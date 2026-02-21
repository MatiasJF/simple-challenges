/**
 * Server Wallet API Route
 *
 * GET  ?action=create   → Initialize the server wallet
 * GET  ?action=status   → Check if a saved wallet exists
 * GET  ?action=request  → Create a PaymentRequest for funding
 * GET  ?action=balance  → Get server wallet balance
 * GET  ?action=outputs  → List server wallet outputs
 * GET  ?action=reset    → Delete saved wallet
 * POST ?action=receive  → Internalize a payment from the desktop wallet
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrivateKey } from '@bsv/sdk'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'
import { join } from 'path'

const WALLET_FILE = join(process.cwd(), '.server-wallet.json')
let serverWallet: any = null
let initPromise: Promise<any> | null = null

function loadSavedKey(): string | null {
  try { if (existsSync(WALLET_FILE)) { const data = JSON.parse(readFileSync(WALLET_FILE, 'utf-8')); return data.privateKey || null } } catch {}
  return null
}
function saveKey(privateKey: string, identityKey: string) { writeFileSync(WALLET_FILE, JSON.stringify({ privateKey, identityKey }, null, 2)) }
function deleteSaved() { try { if (existsSync(WALLET_FILE)) unlinkSync(WALLET_FILE) } catch {} }

async function getServerWallet() {
  if (serverWallet) return serverWallet
  if (initPromise) return initPromise
  initPromise = (async () => {
    const { ServerWallet } = await import('@bsv/simple/server')
    const savedKey = loadSavedKey()
    const privateKey = process.env.SERVER_PRIVATE_KEY || savedKey || PrivateKey.fromRandom().toHex()
    serverWallet = await ServerWallet.create({ privateKey, network: 'main', storageUrl: 'https://storage.babbage.systems' })
    if (!process.env.SERVER_PRIVATE_KEY) saveKey(privateKey, serverWallet.getIdentityKey())
    return serverWallet
  })()
  return initPromise
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || 'create'
  try {
    if (action === 'status') {
      const savedKey = loadSavedKey()
      if (savedKey) { try { const data = JSON.parse(readFileSync(WALLET_FILE, 'utf-8')); return NextResponse.json({ success: true, saved: true, identityKey: data.identityKey || null }) } catch {} }
      return NextResponse.json({ success: true, saved: false })
    }
    if (action === 'reset') { serverWallet = null; initPromise = null; deleteSaved(); return NextResponse.json({ success: true, message: 'Server wallet reset' }) }
    if (action === 'create') {
      const wallet = await getServerWallet()
      return NextResponse.json({ success: true, serverIdentityKey: wallet.getIdentityKey(), status: wallet.getStatus() })
    }
    if (action === 'request') {
      const wallet = await getServerWallet()
      const request = wallet.createPaymentRequest({ satoshis: 1000, memo: 'Freelancer marketplace funding' })
      return NextResponse.json({ success: true, paymentRequest: request, serverIdentityKey: wallet.getIdentityKey() })
    }
    if (action === 'balance') {
      const wallet = await getServerWallet()
      const client = wallet.getClient()
      const basket = req.nextUrl.searchParams.get('basket') || 'default'
      const result = await client.listOutputs({ basket })
      const outputList = result?.outputs ?? []
      const totalSatoshis = outputList.reduce((sum: number, o: any) => sum + (o.satoshis || 0), 0)
      const spendable = outputList.filter((o: any) => o.spendable !== false)
      const spendableSatoshis = spendable.reduce((sum: number, o: any) => sum + (o.satoshis || 0), 0)
      return NextResponse.json({ success: true, basket, totalOutputs: result?.totalOutputs ?? outputList.length, totalSatoshis, spendableOutputs: spendable.length, spendableSatoshis })
    }
    if (action === 'outputs') {
      const wallet = await getServerWallet()
      const client = wallet.getClient()
      const basket = req.nextUrl.searchParams.get('basket') || 'default'
      const result = await client.listOutputs({ basket, include: 'locking scripts' })
      const outputList = result?.outputs ?? []
      return NextResponse.json({ success: true, basket, totalOutputs: result?.totalOutputs ?? outputList.length, outputs: outputList.map((o: any) => ({ outpoint: o.outpoint, satoshis: o.satoshis, spendable: o.spendable })) })
    }
    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    if (action === 'create') { initPromise = null; serverWallet = null }
    return NextResponse.json({ success: false, error: `${action} failed: ${(error as Error).message}` }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || 'receive'
  try {
    if (action === 'receive') {
      const wallet = await getServerWallet()
      const body = await req.json()
      const { tx, senderIdentityKey, derivationPrefix, derivationSuffix, outputIndex } = body
      if (!tx || !senderIdentityKey || !derivationPrefix || !derivationSuffix) {
        return NextResponse.json({ success: false, error: 'Missing required fields: tx, senderIdentityKey, derivationPrefix, derivationSuffix' }, { status: 400 })
      }
      await wallet.receivePayment({ tx, senderIdentityKey, derivationPrefix, derivationSuffix, outputIndex: outputIndex ?? 0, description: 'Desktop wallet funding' })
      return NextResponse.json({ success: true, message: 'Payment internalized successfully', serverIdentityKey: wallet.getIdentityKey() })
    }
    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ success: false, error: `${action} failed: ${(error as Error).message}` }, { status: 500 })
  }
}
