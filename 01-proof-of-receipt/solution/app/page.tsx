'use client'

import { useState } from 'react'
import { createWallet } from '@bsv/simple/browser'

// ---------------------------------------------------------------------------
// Product catalog
// ---------------------------------------------------------------------------
const PRODUCTS = [
  { id: 1, name: 'Espresso', price: 500, emoji: '\u2615' },
  { id: 2, name: 'Sandwich', price: 1500, emoji: '\uD83E\uDD6A' },
  { id: 3, name: 'Salad Bowl', price: 2000, emoji: '\uD83E\uDD57' },
  { id: 4, name: 'Fresh Juice', price: 800, emoji: '\uD83E\uDDC3' },
  { id: 5, name: 'Pastry', price: 600, emoji: '\uD83E\uDD50' },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Receipt {
  product: string
  price: number
  timestamp: string
  buyer: string
}

interface ReceiptToken {
  outpoint: string
  satoshis: number
  data: Receipt | null
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function ProofOfReceiptPage() {
  const [wallet, setWallet] = useState<any | null>(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [buyingId, setBuyingId] = useState<number | null>(null)
  const [receipts, setReceipts] = useState<ReceiptToken[]>([])
  const [loadingReceipts, setLoadingReceipts] = useState(false)
  const [lastTxid, setLastTxid] = useState<string | null>(null)

  // =========================================================================
  // Connect Wallet
  // =========================================================================
  const handleConnect = async () => {
    setLoading(true)
    setStatus('Connecting to BSV Desktop Wallet...')
    try {
      const w = await createWallet()
      setWallet(w)
      const key = w.getIdentityKey()
      setStatus(`Connected! Identity: ${key.substring(0, 20)}...`)
    } catch (error) {
      setStatus(`Connection failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // =========================================================================
  // Buy product  ->  createToken + inscribeJSON
  // =========================================================================
  const handleBuy = async (product: typeof PRODUCTS[number]) => {
    if (!wallet) {
      setStatus('Please connect your wallet first.')
      return
    }

    setBuyingId(product.id)
    setStatus(`Purchasing ${product.name}...`)

    try {
      // 1. Build receipt data
      const receipt: Receipt = {
        product: product.name,
        price: product.price,
        timestamp: new Date().toISOString(),
        buyer: wallet.getIdentityKey().substring(0, 20),
      }

      // 2. Create a token with the receipt as encrypted data
      const tokenResult = await wallet.createToken({
        data: receipt,
        basket: 'receipts',
      })

      // 3. Inscribe the receipt JSON on-chain (publicly verifiable)
      const inscriptionResult = await wallet.inscribeJSON(receipt)

      setLastTxid(tokenResult.txid)
      setStatus(
        `Purchase complete! Token TXID: ${tokenResult.txid.substring(0, 16)}... | Inscription TXID: ${inscriptionResult.txid.substring(0, 16)}...`
      )

      // Auto-refresh receipts list
      await loadReceipts()
    } catch (error) {
      setStatus(`Purchase failed: ${(error as Error).message}`)
    } finally {
      setBuyingId(null)
    }
  }

  // =========================================================================
  // Load receipts  ->  listTokenDetails
  // =========================================================================
  const loadReceipts = async () => {
    if (!wallet) {
      setStatus('Please connect your wallet first.')
      return
    }

    setLoadingReceipts(true)
    try {
      const details = await wallet.listTokenDetails('receipts')
      setReceipts(
        details.map((t: any) => ({
          outpoint: t.outpoint,
          satoshis: t.satoshis,
          data: t.data as Receipt | null,
        }))
      )
    } catch (error) {
      setStatus(`Failed to load receipts: ${(error as Error).message}`)
    } finally {
      setLoadingReceipts(false)
    }
  }

  const handleLoadReceipts = async () => {
    setStatus('Loading receipts...')
    await loadReceipts()
    setStatus(`Found ${receipts.length} receipt(s).`)
  }

  // =========================================================================
  // Helpers
  // =========================================================================
  const formatSats = (sats: number) => {
    return sats.toLocaleString() + ' sats'
  }

  const truncate = (str: string, len: number = 24) => {
    if (str.length <= len) return str
    return str.substring(0, len) + '...'
  }

  // =========================================================================
  // Render
  // =========================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-600 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
            Proof of Receipt
          </h1>
          <p className="text-white/90 text-lg drop-shadow">
            Tamper-proof digital receipts on the BSV blockchain
          </p>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Status Bar                                                       */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/30">
          <div className="flex items-center gap-3">
            {(loading || buyingId !== null || loadingReceipts) && (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent flex-shrink-0" />
            )}
            <p className="text-white font-medium">
              {status || 'Welcome! Connect your wallet to start shopping.'}
            </p>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Connect Wallet                                                   */}
        {/* ---------------------------------------------------------------- */}
        {!wallet ? (
          <div className="text-center mb-10">
            <button
              onClick={handleConnect}
              disabled={loading}
              className="bg-white text-amber-700 font-bold text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        ) : (
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-2 bg-emerald-500/30 text-white text-sm font-medium px-4 py-2 rounded-full border border-emerald-300/40">
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              Wallet Connected
            </span>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Product Catalog                                                  */}
        {/* ---------------------------------------------------------------- */}
        <h2 className="text-white text-2xl font-bold mb-4 drop-shadow">
          Product Catalog
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {PRODUCTS.map((product) => {
            const isBuying = buyingId === product.id
            return (
              <div
                key={product.id}
                className="bg-white/15 backdrop-blur-sm rounded-xl p-6 border-2 border-white/25 shadow-lg hover:shadow-xl hover:border-white/40 transition-all"
              >
                <div className="text-5xl mb-3 text-center">{product.emoji}</div>
                <h3 className="text-white font-bold text-xl text-center mb-1">
                  {product.name}
                </h3>
                <p className="text-amber-100 text-center mb-4 font-mono text-sm">
                  {formatSats(product.price)}
                </p>
                <button
                  onClick={() => handleBuy(product)}
                  disabled={!wallet || buyingId !== null}
                  className="w-full bg-white text-amber-700 font-bold py-2.5 rounded-lg shadow hover:shadow-md hover:bg-amber-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  {isBuying ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent" />
                      Processing...
                    </span>
                  ) : (
                    'Buy'
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Success banner                                                   */}
        {/* ---------------------------------------------------------------- */}
        {lastTxid && (
          <div className="bg-emerald-500/30 backdrop-blur-sm border border-emerald-300/40 rounded-xl p-4 mb-6">
            <p className="text-white font-medium">
              Last purchase confirmed on-chain!
            </p>
            <p className="text-emerald-100 font-mono text-xs mt-1 break-all">
              TXID: {lastTxid}
            </p>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* My Receipts                                                      */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-2xl font-bold drop-shadow">
            My Receipts
          </h2>
          <button
            onClick={handleLoadReceipts}
            disabled={!wallet || loadingReceipts}
            className="bg-white/20 text-white font-medium text-sm px-4 py-2 rounded-lg border border-white/30 hover:bg-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingReceipts ? (
              <span className="inline-flex items-center gap-2">
                <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                Loading...
              </span>
            ) : (
              'Refresh Receipts'
            )}
          </button>
        </div>

        {receipts.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20 text-center">
            <p className="text-white/70 text-lg">
              No receipts yet. Buy a product to create your first blockchain receipt!
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {receipts.map((receipt, index) => (
              <div
                key={receipt.outpoint || index}
                className="bg-white/15 backdrop-blur-sm rounded-xl p-5 border border-white/25 shadow-md hover:border-white/40 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {receipt.data ? (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">
                            {PRODUCTS.find(p => p.name === receipt.data?.product)?.emoji || '\uD83D\uDCC4'}
                          </span>
                          <div>
                            <h3 className="text-white font-bold text-lg">
                              {receipt.data.product}
                            </h3>
                            <p className="text-amber-100 font-mono text-sm">
                              {formatSats(receipt.data.price)}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          <div className="bg-black/10 rounded-lg px-3 py-2">
                            <p className="text-white/60 text-xs uppercase tracking-wider">Timestamp</p>
                            <p className="text-white text-sm font-mono">
                              {new Date(receipt.data.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-black/10 rounded-lg px-3 py-2">
                            <p className="text-white/60 text-xs uppercase tracking-wider">Outpoint</p>
                            <p className="text-white text-sm font-mono">
                              {truncate(receipt.outpoint, 28)}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <p className="text-white/60 italic">
                          Could not decode receipt data
                        </p>
                        <p className="text-white/40 font-mono text-xs mt-1">
                          {truncate(receipt.outpoint, 40)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="bg-emerald-500/30 text-emerald-100 text-xs font-medium px-2 py-1 rounded-md border border-emerald-300/30 ml-3 flex-shrink-0">
                    On-Chain
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Footer                                                           */}
        {/* ---------------------------------------------------------------- */}
        <div className="mt-10 text-center text-white/70 text-sm pb-4">
          <p>
            Built with <span className="font-semibold text-white/90">@bsv/simple</span> | Challenge 1: Proof of Receipt
          </p>
        </div>
      </div>
    </div>
  )
}
