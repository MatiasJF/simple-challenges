/**
 * DID Resolution Proxy
 *
 * Server-side proxy that resolves did:bsv DIDs.
 * 1. Try nChain Universal Resolver first
 * 2. On nChain failure, fall back to WoC chain-following (server-side, no CORS)
 *
 * GET ?did=did:bsv:<txid> → DIDResolutionResult
 */

import { NextRequest, NextResponse } from 'next/server'

const RESOLVER_URL = 'https://bsvdid-universal-resolver.nchain.systems'
const WOC_BASE = 'https://api.whatsonchain.com/v1/bsv/main'
const BSVDID_MARKER = 'BSVDID'
const MAX_HOPS = 100

// ---------------------------------------------------------------------------
// OP_RETURN parser (mirrors did.ts parseOpReturnSegments)
// ---------------------------------------------------------------------------

function parseOpReturnSegments(hexScript: string): string[] {
  try {
    const bytes = hexToBytes(hexScript)
    const segments: string[] = []
    let i = 0

    // Find OP_RETURN (0x6a). It may be preceded by OP_FALSE (0x00).
    while (i < bytes.length) {
      if (bytes[i] === 0x6a) {
        i++
        break
      }
      i++
    }
    if (i >= bytes.length) return []

    // Read data pushes after OP_RETURN
    while (i < bytes.length) {
      const op = bytes[i]
      i++

      let len = 0
      if (op >= 0x01 && op <= 0x4b) {
        // Direct push: op byte IS the length
        len = op
      } else if (op === 0x4c) {
        // OP_PUSHDATA1
        if (i >= bytes.length) break
        len = bytes[i]
        i++
      } else if (op === 0x4d) {
        // OP_PUSHDATA2
        if (i + 1 >= bytes.length) break
        len = bytes[i] | (bytes[i + 1] << 8)
        i += 2
      } else if (op === 0x4e) {
        // OP_PUSHDATA4
        if (i + 3 >= bytes.length) break
        len = bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24)
        i += 4
      } else {
        // Non-push opcode — stop
        break
      }

      if (i + len > bytes.length) break
      const data = bytes.slice(i, i + len)
      i += len

      // Decode as UTF-8
      segments.push(new TextDecoder().decode(new Uint8Array(data)))
    }

    return segments
  } catch {
    return []
  }
}

function hexToBytes(hex: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16))
  }
  return bytes
}

// ---------------------------------------------------------------------------
// WoC chain-following resolver (server-side — no CORS, no browser rate limits)
// ---------------------------------------------------------------------------

interface DIDResolutionResult {
  didDocument: any
  didDocumentMetadata: Record<string, any>
  didResolutionMetadata: Record<string, any>
}

async function resolveViaWoC(txid: string): Promise<DIDResolutionResult> {
  const notFound: DIDResolutionResult = {
    didDocument: null,
    didDocumentMetadata: {},
    didResolutionMetadata: { error: 'notFound', message: 'DID not found on chain' }
  }

  let currentTxid = txid
  let lastDocument: any = null
  let lastDocTxid: string | undefined
  let created: string | undefined
  let updated: string | undefined
  let foundIssuance = false
  const visited = new Set<string>()

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    if (visited.has(currentTxid)) break
    visited.add(currentTxid)

    // Fetch the transaction
    const txResp = await fetch(`${WOC_BASE}/tx/${currentTxid}`)
    if (!txResp.ok) return notFound
    const txData: any = await txResp.json()

    if (!created) {
      created = txData.time ? new Date(txData.time * 1000).toISOString() : undefined
    }

    // Parse OP_RETURN outputs to find BSVDID segments
    let segments: string[] = []
    for (const vout of txData.vout || []) {
      const hex = vout?.scriptPubKey?.hex
      if (!hex) continue
      const s = parseOpReturnSegments(hex)
      if (s.length >= 3 && s[0] === BSVDID_MARKER) {
        segments = s
        break
      }
    }

    if (segments.length >= 3) {
      const payload = segments[2]

      if (payload === '3') {
        // Revocation
        return {
          didDocument: lastDocument,
          didDocumentMetadata: {
            created,
            updated,
            deactivated: true,
            versionId: currentTxid
          },
          didResolutionMetadata: { contentType: 'application/did+ld+json' }
        }
      }

      if (payload === '2') {
        // Funding tx — continue
      } else if (payload === '1') {
        // Issuance tx — continue
        foundIssuance = true
      } else {
        // Assume JSON document payload
        try {
          lastDocument = JSON.parse(payload)
          lastDocTxid = currentTxid
          updated = txData.time ? new Date(txData.time * 1000).toISOString() : undefined
        } catch {
          // Not valid JSON — skip
        }
      }
    }

    // Follow output 0 spend chain
    let nextTxid: string | null = null

    // Strategy 1: spend endpoint (fast)
    try {
      const spendResp = await fetch(`${WOC_BASE}/tx/${currentTxid}/out/0/spend`)
      if (spendResp.ok && spendResp.status !== 404) {
        const spendData: any = await spendResp.json()
        nextTxid = spendData?.txid || null
      }
    } catch { /* fall through to address history */ }

    // Strategy 2: address history fallback
    if (!nextTxid) {
      const out0Addr = txData.vout?.[0]?.scriptPubKey?.addresses?.[0]
      if (out0Addr) {
        try {
          const histResp = await fetch(`${WOC_BASE}/address/${out0Addr}/history`)
          if (histResp.ok) {
            const history = (await histResp.json()) as Array<{ tx_hash: string; height: number }>
            const candidates = history
              .filter(e => !visited.has(e.tx_hash))
              .sort((a, b) => (b.height || 0) - (a.height || 0))
            if (candidates.length > 0) {
              nextTxid = candidates[0].tx_hash
            }
          }
        } catch { /* address history unavailable */ }
      }
    }

    if (!nextTxid) break
    currentTxid = nextTxid
  }

  if (lastDocument) {
    return {
      didDocument: lastDocument,
      didDocumentMetadata: {
        created,
        updated,
        versionId: lastDocTxid
      },
      didResolutionMetadata: { contentType: 'application/did+ld+json' }
    }
  }

  if (foundIssuance) {
    return {
      didDocument: null,
      didDocumentMetadata: { created },
      didResolutionMetadata: {
        error: 'notYetAvailable',
        message: 'DID issuance found on chain but document transaction has not propagated yet. Try again shortly.'
      }
    }
  }

  return notFound
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const did = req.nextUrl.searchParams.get('did')
  if (!did) {
    return NextResponse.json(
      { error: 'Missing "did" query parameter' },
      { status: 400 }
    )
  }

  // Extract txid from did:bsv:<txid>
  const txidMatch = did.match(/^did:bsv:([0-9a-f]{64})$/i)

  // --- Step 1: Try nChain Universal Resolver ---
  try {
    const response = await fetch(
      `${RESOLVER_URL}/1.0/identifiers/${encodeURIComponent(did)}`,
      {
        headers: { 'Accept': 'application/did+ld+json' },
        signal: AbortSignal.timeout(10_000)
      }
    )

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        didDocument: data.didDocument || data,
        didDocumentMetadata: data.didDocumentMetadata || {},
        didResolutionMetadata: {
          contentType: 'application/did+ld+json',
          ...(data.didResolutionMetadata || {})
        }
      })
    }

    if (response.status === 410) {
      const data = await response.json().catch(() => ({}))
      return NextResponse.json({
        didDocument: data.didDocument || null,
        didDocumentMetadata: { deactivated: true, ...(data.didDocumentMetadata || {}) },
        didResolutionMetadata: {
          contentType: 'application/did+ld+json',
          ...(data.didResolutionMetadata || {})
        }
      })
    }

    // Non-200/410 — fall through to WoC
  } catch {
    // nChain timeout or network error — fall through to WoC
  }

  // --- Step 2: WoC chain-following fallback ---
  if (txidMatch) {
    try {
      const result = await resolveViaWoC(txidMatch[1].toLowerCase())
      return NextResponse.json(result)
    } catch (error) {
      return NextResponse.json(
        {
          didDocument: null,
          didDocumentMetadata: {},
          didResolutionMetadata: {
            error: 'internalError',
            message: `WoC resolution failed: ${(error as Error).message}`
          }
        },
        { status: 502 }
      )
    }
  }

  // Not a txid-based DID and nChain failed — nothing more we can do
  return NextResponse.json(
    {
      didDocument: null,
      didDocumentMetadata: {},
      didResolutionMetadata: {
        error: 'notFound',
        message: 'DID could not be resolved'
      }
    },
    { status: 404 }
  )
}
