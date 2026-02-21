'use client'

import { useState } from 'react'
import { createWallet } from '@bsv/simple/browser'

export default function PeerTipJarPage() {
  const [wallet, setWallet] = useState<any | null>(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [messageBoxHandle, setMessageBoxHandle] = useState<string | null>(null)
  const [incomingPayments, setIncomingPayments] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [createdDID, setCreatedDID] = useState<string | null>(null)
  const [resolvedDID, setResolvedDID] = useState<any | null>(null)
  const [didInput, setDidInput] = useState('')
  const [tipAmount, setTipAmount] = useState('1000')
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null)
  const [handleInput, setHandleInput] = useState('')

  const REGISTRY_URL = '/api/identity-registry'

  // ============================================================================
  // 1. Connect Wallet
  // ============================================================================
  const handleConnectWallet = async () => {
    setLoading(true)
    setStatus('Connecting to BSV Desktop Wallet...')
    try {
      const w = await createWallet({ didProxyUrl: '/api/resolve-did' })
      setWallet(w)
      const st = w.getStatus()

      // Auto-check if already certified for MessageBox
      const handle = await w.getMessageBoxHandle(REGISTRY_URL)
      if (handle) {
        setMessageBoxHandle(handle)
        setStatus(`Connected as "${handle}" -- Identity: ${st.identityKey?.substring(0, 20)}...`)
      } else {
        setStatus(`Connected! Identity: ${st.identityKey?.substring(0, 20)}...`)
      }
    } catch (error) {
      setStatus(`Connection failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // 2. Register Handle
  // ============================================================================
  const handleRegisterHandle = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    if (!handleInput.trim()) { setStatus('Please enter a handle'); return }
    setLoading(true)
    setStatus(`Registering as "${handleInput.trim()}"...`)
    try {
      const result = await wallet.certifyForMessageBox(handleInput.trim(), REGISTRY_URL)
      setMessageBoxHandle(result.handle)
      setHandleInput('')
      setStatus(`Certified as "${result.handle}" -- you are now discoverable!`)
    } catch (error) {
      setStatus(`Registration failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // 3. Search Creators
  // ============================================================================
  const handleSearch = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    if (!searchQuery.trim()) { setStatus('Please enter a search query'); return }
    setLoading(true)
    setStatus(`Searching for "${searchQuery.trim()}"...`)
    try {
      const results = await wallet.lookupIdentityByTag(searchQuery.trim(), REGISTRY_URL)
      setSearchResults(results)
      setStatus(`Found ${results.length} creator(s) matching "${searchQuery.trim()}"`)
    } catch (error) {
      setStatus(`Search failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // 4. Send Tip
  // ============================================================================
  const handleSendTip = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    if (!selectedRecipient) { setStatus('Please select a recipient from search results'); return }
    const satoshis = parseInt(tipAmount, 10)
    if (isNaN(satoshis) || satoshis <= 0) { setStatus('Please enter a valid tip amount'); return }

    setLoading(true)
    setStatus(`Sending ${satoshis} sats to "${selectedRecipient.tag}"...`)
    try {
      const result = await wallet.sendMessageBoxPayment(
        selectedRecipient.identityKey,
        satoshis,
        'recovered-change'
      )
      setStatus(
        `Tip sent! ${satoshis} sats to "${selectedRecipient.tag}" | ` +
        `Recovered: ${result.reinternalized?.count ?? 0} orphaned output(s)`
      )
      setSelectedRecipient(null)
    } catch (error) {
      setStatus(`Tip failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // 5. List Inbox
  // ============================================================================
  const handleCheckInbox = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Checking inbox for incoming tips...')
    try {
      const payments = await wallet.listIncomingPayments()
      setIncomingPayments(payments)
      setStatus(`Found ${payments.length} incoming tip(s)`)
    } catch (error) {
      setStatus(`Inbox check failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // 6. Accept Tip
  // ============================================================================
  const handleAcceptTip = async (payment: any, index: number) => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Accepting incoming tip...')
    try {
      await wallet.acceptIncomingPayment(payment, 'tips-received')
      setIncomingPayments(prev => prev.filter((_, i) => i !== index))
      setStatus('Tip accepted and added to your wallet!')
    } catch (error) {
      setStatus(`Accept failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // 7. Create DID
  // ============================================================================
  const handleCreateDID = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Creating DID on-chain...')
    try {
      const result = await wallet.createDID()
      setCreatedDID(result.did)
      setDidInput(result.did)
      setStatus(`DID created: ${result.did}`)
    } catch (error) {
      setStatus(`DID creation failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // 8. Resolve DID
  // ============================================================================
  const handleResolveDID = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    if (!didInput.trim()) { setStatus('Please enter a DID to resolve'); return }
    setLoading(true)
    setStatus(`Resolving ${didInput.trim().substring(0, 40)}...`)
    try {
      const result = await wallet.resolveDID(didInput.trim())
      setResolvedDID(result)
      const deactivated = result.didDocumentMetadata?.deactivated
      setStatus(deactivated ? `Resolved (DEACTIVATED): ${didInput.trim()}` : `Resolved: ${didInput.trim()}`)
    } catch (error) {
      setStatus(`DID resolution failed: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Styles
  // ============================================================================
  const card = 'bg-white rounded-xl shadow-md border border-gray-100 p-6 space-y-4'
  const btnPrimary = 'px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed'
  const btnSecondary = 'px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed'
  const btnAccept = 'px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:cursor-not-allowed'
  const input = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all'
  const label = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-emerald-800">Peer Tip Jar</h1>
            <p className="text-sm text-gray-500">Challenge 2 -- BSV Simple</p>
          </div>
          <div className="flex items-center gap-3">
            {messageBoxHandle && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                {messageBoxHandle}
              </span>
            )}
            <span className={`w-3 h-3 rounded-full ${wallet ? 'bg-emerald-500' : 'bg-gray-300'}`} />
          </div>
        </div>
      </header>

      {/* Status Bar */}
      {status && (
        <div className="max-w-4xl mx-auto px-6 mt-4">
          <div className={`px-4 py-3 rounded-lg text-sm font-mono ${
            status.toLowerCase().includes('error') || status.toLowerCase().includes('failed')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {loading && <span className="inline-block animate-spin mr-2">&#9696;</span>}
            {status}
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* ================================================================ */}
        {/* Section 1: Connect Wallet */}
        {/* ================================================================ */}
        <section className={card}>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">1</span>
            <h2 className="text-xl font-semibold text-gray-800">Connect Wallet</h2>
          </div>
          <p className="text-gray-500 text-sm">
            Connect your BSV Desktop Wallet to get started. If you have already registered a handle, it will be detected automatically.
          </p>
          <button
            onClick={handleConnectWallet}
            disabled={loading || !!wallet}
            className={btnPrimary}
          >
            {wallet ? 'Wallet Connected' : 'Connect Wallet'}
          </button>
        </section>

        {/* ================================================================ */}
        {/* Section 2: Register Handle */}
        {/* ================================================================ */}
        <section className={card}>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">2</span>
            <h2 className="text-xl font-semibold text-gray-800">Register Handle</h2>
          </div>
          <p className="text-gray-500 text-sm">
            Register a human-readable handle so fans can find you and send tips. This certifies your wallet for MessageBox messaging.
          </p>
          {messageBoxHandle ? (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-3 rounded-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
              <span className="font-medium">Registered as: {messageBoxHandle}</span>
            </div>
          ) : (
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="@yourhandle"
                value={handleInput}
                onChange={e => setHandleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegisterHandle()}
                className={input}
                disabled={loading || !wallet}
              />
              <button
                onClick={handleRegisterHandle}
                disabled={loading || !wallet || !handleInput.trim()}
                className={`${btnPrimary} whitespace-nowrap`}
              >
                Register
              </button>
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* Section 3: Search Creators */}
        {/* ================================================================ */}
        <section className={card}>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">3</span>
            <h2 className="text-xl font-semibold text-gray-800">Search Creators</h2>
          </div>
          <p className="text-gray-500 text-sm">
            Find creators by their registered handle. Select one to send a tip.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search by handle (e.g. alice)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className={input}
              disabled={loading || !wallet}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !wallet || !searchQuery.trim()}
              className={`${btnSecondary} whitespace-nowrap`}
            >
              Search
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-sm text-gray-500 font-medium">{searchResults.length} result(s):</p>
              {searchResults.map((result, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedRecipient(result)}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedRecipient?.identityKey === result.identityKey
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-gray-800">{result.tag}</p>
                    <p className="text-xs text-gray-400 font-mono">{result.identityKey.substring(0, 24)}...</p>
                  </div>
                  {selectedRecipient?.identityKey === result.identityKey && (
                    <span className="text-emerald-600 text-sm font-medium">Selected</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ================================================================ */}
        {/* Section 4: Send Tip */}
        {/* ================================================================ */}
        <section className={card}>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">4</span>
            <h2 className="text-xl font-semibold text-gray-800">Send Tip</h2>
          </div>
          <p className="text-gray-500 text-sm">
            Send a P2P tip to the selected creator via MessageBox. No intermediary, no fees.
          </p>
          {selectedRecipient ? (
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
                <p className="text-sm text-teal-600">Sending to:</p>
                <p className="font-semibold text-teal-800">{selectedRecipient.tag}</p>
                <p className="text-xs text-teal-500 font-mono">{selectedRecipient.identityKey.substring(0, 32)}...</p>
              </div>
              <div>
                <label className={label}>Tip Amount (satoshis)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="1000"
                  value={tipAmount}
                  onChange={e => setTipAmount(e.target.value)}
                  className={input}
                  disabled={loading}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSendTip}
                  disabled={loading || !tipAmount}
                  className={btnPrimary}
                >
                  Send {tipAmount} sats
                </button>
                <button
                  onClick={() => setSelectedRecipient(null)}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 italic text-sm">Search for a creator and select them to send a tip.</p>
          )}
        </section>

        {/* ================================================================ */}
        {/* Section 5: Inbox */}
        {/* ================================================================ */}
        <section className={card}>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">5</span>
            <h2 className="text-xl font-semibold text-gray-800">Inbox</h2>
          </div>
          <p className="text-gray-500 text-sm">
            Check for incoming tips sent to you via MessageBox. Accept them to add the funds to your wallet.
          </p>
          <button
            onClick={handleCheckInbox}
            disabled={loading || !wallet || !messageBoxHandle}
            className={btnSecondary}
          >
            Check Inbox
          </button>

          {incomingPayments.length > 0 ? (
            <div className="space-y-3 mt-4">
              <p className="text-sm text-gray-500 font-medium">{incomingPayments.length} incoming tip(s):</p>
              {incomingPayments.map((payment, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">
                      {payment.token?.amount ? `${payment.token.amount} sats` : 'Incoming tip'}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      From: {payment.sender?.substring(0, 20)}...
                    </p>
                    {payment.messageId && (
                      <p className="text-xs text-gray-400">ID: {payment.messageId}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAcceptTip(payment, i)}
                    disabled={loading}
                    className={btnAccept}
                  >
                    Accept
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 italic text-sm mt-2">No incoming tips. Click "Check Inbox" to refresh.</p>
          )}
        </section>

        {/* ================================================================ */}
        {/* Section 6: DID (Decentralized Identity) */}
        {/* ================================================================ */}
        <section className={card}>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">6</span>
            <h2 className="text-xl font-semibold text-gray-800">Decentralized Identity (DID)</h2>
          </div>
          <p className="text-gray-500 text-sm">
            Create a DID on-chain for verifiable identity, or resolve an existing DID to view its document.
          </p>

          {/* Create DID */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Create DID</h3>
            <button
              onClick={handleCreateDID}
              disabled={loading || !wallet}
              className={btnPrimary}
            >
              Create New DID
            </button>
            {createdDID && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-sm text-green-600">Your DID:</p>
                <p className="font-mono text-sm text-green-800 break-all">{createdDID}</p>
              </div>
            )}
          </div>

          {/* Resolve DID */}
          <div className="space-y-3 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Resolve DID</h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="did:bsv:abcdef1234..."
                value={didInput}
                onChange={e => setDidInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleResolveDID()}
                className={input}
                disabled={loading || !wallet}
              />
              <button
                onClick={handleResolveDID}
                disabled={loading || !wallet || !didInput.trim()}
                className={`${btnSecondary} whitespace-nowrap`}
              >
                Resolve
              </button>
            </div>
            {resolvedDID && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 overflow-auto">
                <p className="text-sm text-gray-600 mb-2 font-medium">DID Document:</p>
                {resolvedDID.didDocumentMetadata?.deactivated && (
                  <p className="text-red-600 text-sm font-semibold mb-2">This DID has been deactivated.</p>
                )}
                <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(resolvedDID, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-8 text-center text-sm text-gray-400">
        Peer Tip Jar -- Challenge 2 -- Built with @bsv/simple
      </footer>
    </div>
  )
}
