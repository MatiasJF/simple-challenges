'use client'

import { useState, useEffect } from 'react'
import { createWallet } from '@bsv/simple/browser'

const REGISTRY_URL = '/api/identity-registry'

const SKILL_OPTIONS = [
  { value: 'web-dev', label: 'Web Development' },
  { value: 'mobile-dev', label: 'Mobile Development' },
  { value: 'design', label: 'UI/UX Design' },
  { value: 'backend', label: 'Backend Engineering' },
  { value: 'devops', label: 'DevOps' },
  { value: 'data', label: 'Data Science' },
]

type TabKey = 'admin' | 'freelancer' | 'client'

export default function FreelancerMarketplacePage() {
  // ============================================================================
  // State
  // ============================================================================
  const [activeTab, setActiveTab] = useState<TabKey>('admin')
  const [wallet, setWallet] = useState<any | null>(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  // Admin state
  const [serverWalletCreated, setServerWalletCreated] = useState(false)
  const [serverIdentityKey, setServerIdentityKey] = useState<string | null>(null)
  const [serverFunded, setServerFunded] = useState(false)
  const [issuerInfo, setIssuerInfo] = useState<any>(null)

  // Freelancer state
  const [messageBoxHandle, setMessageBoxHandle] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<any[]>([])
  const [incomingPayments, setIncomingPayments] = useState<any[]>([])
  const [createdDID, setCreatedDID] = useState<string | null>(null)

  // Freelancer credential form
  const [credName, setCredName] = useState('')
  const [credSkill, setCredSkill] = useState('web-dev')
  const [credRate, setCredRate] = useState('')
  const [credBio, setCredBio] = useState('')

  // Client state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [paymentAmount, setPaymentAmount] = useState('5000')
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null)

  // DID resolve
  const [didToResolve, setDidToResolve] = useState('')

  // Check for saved server wallet on mount
  useEffect(() => {
    fetch('/api/server-wallet?action=status')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.saved) {
          setServerWalletCreated(true)
          setServerIdentityKey(data.identityKey || null)
        }
      })
      .catch(() => {})
  }, [])

  // ============================================================================
  // Helpers
  // ============================================================================
  const addResult = (result: any) => {
    setResults(prev => [
      { ...result, timestamp: new Date().toLocaleTimeString() },
      ...prev
    ].slice(0, 30))
  }

  // ============================================================================
  // ADMIN: Create Server Wallet
  // ============================================================================
  const handleCreateServerWallet = async () => {
    setLoading(true)
    setStatus('Creating server wallet...')
    try {
      const res = await fetch('/api/server-wallet?action=create')
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setServerWalletCreated(true)
      setServerIdentityKey(data.serverIdentityKey)
      setStatus(`Server wallet created! Identity: ${data.serverIdentityKey.substring(0, 20)}...`)
      addResult({ type: 'admin', action: 'create-server-wallet', success: true, data: { serverIdentityKey: data.serverIdentityKey } })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'admin', action: 'create-server-wallet', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // ADMIN: Fund Server Wallet
  // ============================================================================
  const handleFundServerWallet = async () => {
    if (!wallet) { setStatus('Please connect wallet first (Freelancer or Client tab)'); return }
    setLoading(true)
    setStatus('Requesting payment from server wallet...')
    try {
      // Step 1: Get payment request
      const reqRes = await fetch('/api/server-wallet?action=request')
      const reqData = await reqRes.json()
      if (!reqData.success) throw new Error(reqData.error)
      const paymentRequest = reqData.paymentRequest
      setStatus(`Got request for ${paymentRequest.satoshis} sats. Funding...`)

      // Step 2: Fund with BRC-29 derived payment
      const result = await wallet.fundServerWallet(paymentRequest, 'marketplace-funding', 'recovered-change')
      setStatus('Payment created. Sending to server for internalization...')

      // Step 3: Send tx back to server
      const receiveRes = await fetch('/api/server-wallet?action=receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx: Array.from(result.tx),
          senderIdentityKey: wallet.getIdentityKey(),
          derivationPrefix: paymentRequest.derivationPrefix,
          derivationSuffix: paymentRequest.derivationSuffix,
          outputIndex: 0
        })
      })
      const receiveData = await receiveRes.json()
      if (!receiveData.success) throw new Error(receiveData.error)

      setServerFunded(true)
      setStatus(`Server wallet funded! TXID: ${result.txid.substring(0, 20)}...`)
      addResult({ type: 'admin', action: 'fund-server-wallet', success: true, data: { txid: result.txid, satoshis: paymentRequest.satoshis } })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'admin', action: 'fund-server-wallet', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // ADMIN: Server Balance
  // ============================================================================
  const handleServerBalance = async () => {
    setLoading(true)
    setStatus('Fetching server wallet balance...')
    try {
      const res = await fetch('/api/server-wallet?action=balance')
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setStatus(`Server balance: ${data.spendableSatoshis} sats (${data.spendableOutputs} spendable outputs)`)
      addResult({ type: 'admin', action: 'server-balance', success: true, data })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'admin', action: 'server-balance', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // ADMIN: Issuer Info
  // ============================================================================
  const handleIssuerInfo = async () => {
    setLoading(true)
    setStatus('Fetching credential issuer info...')
    try {
      const res = await fetch('/api/credential-issuer?action=info')
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setIssuerInfo(data)
      setStatus(`Issuer ready! Public key: ${data.publicKey?.substring(0, 20)}...`)
      addResult({ type: 'admin', action: 'issuer-info', success: true, data: { publicKey: data.publicKey, schemas: data.schemas } })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'admin', action: 'issuer-info', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // ADMIN: Reset Server Wallet
  // ============================================================================
  const handleResetServerWallet = async () => {
    setLoading(true)
    setStatus('Resetting server wallet...')
    try {
      const res = await fetch('/api/server-wallet?action=reset')
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setServerWalletCreated(false)
      setServerFunded(false)
      setServerIdentityKey(null)
      setStatus('Server wallet reset.')
      addResult({ type: 'admin', action: 'reset-server-wallet', success: true, data: { message: 'Wallet deleted' } })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'admin', action: 'reset-server-wallet', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // SHARED: Connect Wallet
  // ============================================================================
  const handleConnectWallet = async () => {
    setLoading(true)
    setStatus('Connecting to wallet...')
    try {
      const w = await createWallet({ didProxyUrl: '/api/resolve-did' })
      setWallet(w)
      const st = w.getStatus()

      // Auto-check MessageBox certification
      const handle = await w.getMessageBoxHandle(REGISTRY_URL)
      if (handle) {
        setMessageBoxHandle(handle)
        setStatus(`Connected as "${handle}"! Identity: ${st.identityKey?.substring(0, 20)}...`)
      } else {
        setStatus(`Connected! Identity: ${st.identityKey?.substring(0, 20)}...`)
      }
      addResult({ type: activeTab, action: 'connect-wallet', success: true, data: { identityKey: st.identityKey, handle } })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: activeTab, action: 'connect-wallet', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // FREELANCER: Register Handle
  // ============================================================================
  const handleRegisterHandle = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    const handle = prompt('Choose your freelancer handle (e.g. @alice-dev):')
    if (!handle?.trim()) return
    setLoading(true)
    setStatus(`Registering as "${handle.trim()}"...`)
    try {
      const result = await wallet.certifyForMessageBox(handle.trim(), REGISTRY_URL)
      setMessageBoxHandle(result.handle)
      setStatus(`Registered as "${result.handle}"!`)
      addResult({ type: 'freelancer', action: 'register-handle', success: true, data: { handle: result.handle, txid: result.txid } })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'freelancer', action: 'register-handle', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // FREELANCER: Acquire Credential
  // ============================================================================
  const handleAcquireCredential = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    if (!credName.trim() || !credRate.trim()) { setStatus('Please fill in at least Name and Rate'); return }

    setLoading(true)
    setStatus('Acquiring credential from issuer...')
    try {
      // First fetch issuer info if we don't have it
      if (!issuerInfo) {
        const res = await fetch('/api/credential-issuer?action=info')
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        setIssuerInfo(data)
      }

      const vc = await wallet.acquireCredential({
        serverUrl: '/api/credential-issuer',
        schemaId: 'freelancer-verified',
        fields: {
          name: credName.trim(),
          skill: credSkill,
          rate: credRate.trim(),
          bio: credBio.trim(),
        },
        replaceExisting: true
      })

      setStatus('Credential acquired successfully!')
      addResult({
        type: 'freelancer',
        action: 'acquire-credential',
        success: true,
        data: {
          type: vc.type,
          subject: vc.credentialSubject,
          issuer: vc.issuer
        }
      })

      // Clear form
      setCredName('')
      setCredRate('')
      setCredBio('')
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'freelancer', action: 'acquire-credential', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // FREELANCER: List My Credentials
  // ============================================================================
  const handleListCredentials = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Listing credentials...')
    try {
      // Fetch issuer info to get publicKey and certificateType
      let info = issuerInfo
      if (!info) {
        const res = await fetch('/api/credential-issuer?action=info')
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        info = data
        setIssuerInfo(data)
      }

      const issuerPublicKey = info.publicKey
      const schema = info.schemas?.[0]
      const certificateType = schema?.certificateTypeBase64

      if (!issuerPublicKey || !certificateType) {
        throw new Error('Could not determine issuer public key or certificate type')
      }

      const vcs = await wallet.listCredentials({
        certifiers: [issuerPublicKey],
        types: [certificateType]
      })

      setCredentials(vcs)
      setStatus(`Found ${vcs.length} credential(s)`)
      addResult({
        type: 'freelancer',
        action: 'list-credentials',
        success: true,
        data: {
          count: vcs.length,
          credentials: vcs.slice(0, 5).map((vc: any) => ({
            type: vc.type,
            subject: vc.credentialSubject,
            issuer: vc.issuer,
            issuanceDate: vc.issuanceDate,
          }))
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'freelancer', action: 'list-credentials', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // FREELANCER: Create Presentation
  // ============================================================================
  const handleCreatePresentation = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    if (credentials.length === 0) { setStatus('No credentials to present. List credentials first.'); return }
    setLoading(true)
    setStatus('Creating Verifiable Presentation...')
    try {
      const vp = wallet.createPresentation(credentials)
      setStatus(`Presentation created with ${vp.verifiableCredential.length} credential(s)`)
      addResult({
        type: 'freelancer',
        action: 'create-presentation',
        success: true,
        data: {
          type: vp.type,
          holder: vp.holder,
          credentialCount: vp.verifiableCredential.length,
          proof: { type: vp.proof?.type, proofPurpose: vp.proof?.proofPurpose }
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'freelancer', action: 'create-presentation', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // FREELANCER: Create DID
  // ============================================================================
  const handleCreateDID = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Creating DID...')
    try {
      const result = await wallet.createDID()
      setCreatedDID(result.did)
      setDidToResolve(result.did)
      setStatus(`DID created! ${result.did}`)
      addResult({
        type: 'freelancer',
        action: 'create-did',
        success: true,
        data: { did: result.did, txid: result.txid, identityCode: result.identityCode }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'freelancer', action: 'create-did', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // FREELANCER: Resolve DID
  // ============================================================================
  const handleResolveDID = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    const did = didToResolve.trim()
    if (!did) { setStatus('Enter a DID to resolve'); return }
    setLoading(true)
    setStatus(`Resolving ${did.substring(0, 40)}...`)
    try {
      const result = await wallet.resolveDID(did)
      const deactivated = result.didDocumentMetadata?.deactivated
      setStatus(deactivated ? `Resolved (DEACTIVATED): ${did}` : `Resolved: ${did}`)
      addResult({
        type: 'freelancer',
        action: 'resolve-did',
        success: true,
        data: result
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'freelancer', action: 'resolve-did', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // FREELANCER: Check Inbox
  // ============================================================================
  const handleCheckInbox = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Checking MessageBox inbox...')
    try {
      const payments = await wallet.listIncomingPayments()
      setIncomingPayments(payments)
      setStatus(`Found ${payments.length} incoming payment(s)`)
      addResult({
        type: 'freelancer',
        action: 'check-inbox',
        success: true,
        data: {
          count: payments.length,
          payments: payments.slice(0, 5).map((p: any) => ({
            messageId: p.messageId,
            sender: p.sender?.substring(0, 20) + '...',
            amount: p.token?.amount
          }))
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'freelancer', action: 'check-inbox', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // FREELANCER: Accept Payment
  // ============================================================================
  const handleAcceptPayment = async () => {
    if (!wallet || incomingPayments.length === 0) { setStatus('No incoming payments to accept'); return }
    setLoading(true)
    setStatus('Accepting incoming payment...')
    try {
      const payment = incomingPayments[0]
      const result = await wallet.acceptIncomingPayment(payment, 'freelancer-earnings')
      setIncomingPayments(prev => prev.slice(1))
      setStatus('Payment accepted and internalized!')
      addResult({
        type: 'freelancer',
        action: 'accept-payment',
        success: true,
        data: {
          messageId: payment.messageId,
          sender: payment.sender?.substring(0, 20) + '...',
          result
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'freelancer', action: 'accept-payment', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // CLIENT: Search Freelancers
  // ============================================================================
  const handleSearchFreelancers = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    if (!searchQuery.trim()) { setStatus('Enter a search query'); return }
    setLoading(true)
    setStatus(`Searching for "${searchQuery.trim()}"...`)
    try {
      const results = await wallet.lookupIdentityByTag(searchQuery.trim(), REGISTRY_URL)
      setSearchResults(results)
      setSelectedRecipient(null)
      setStatus(`Found ${results.length} freelancer(s)`)
      addResult({
        type: 'client',
        action: 'search-freelancers',
        success: true,
        data: { query: searchQuery.trim(), count: results.length, results }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'client', action: 'search-freelancers', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // CLIENT: Send Payment
  // ============================================================================
  const handleSendPayment = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    if (!selectedRecipient) { setStatus('Select a freelancer first'); return }
    const satoshis = parseInt(paymentAmount, 10)
    if (isNaN(satoshis) || satoshis <= 0) { setStatus('Enter a valid payment amount'); return }

    setLoading(true)
    setStatus(`Sending ${satoshis} sats to ${selectedRecipient.tag}...`)
    try {
      const result = await wallet.sendMessageBoxPayment(selectedRecipient.identityKey, satoshis, 'recovered-change')
      setStatus(`Payment sent! ${satoshis} sats to ${selectedRecipient.tag}`)
      addResult({
        type: 'client',
        action: 'send-payment',
        success: true,
        data: {
          recipient: selectedRecipient.tag,
          recipientKey: selectedRecipient.identityKey.substring(0, 30) + '...',
          satoshis,
          reinternalized: result.reinternalized
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'client', action: 'send-payment', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // UI Styles
  // ============================================================================
  const btnBase = 'rounded-lg px-4 py-3 font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed disabled:opacity-50 text-sm'
  const btnPrimary = `${btnBase} bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800`
  const btnSecondary = `${btnBase} bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800`
  const btnSuccess = `${btnBase} bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800`
  const btnWarning = `${btnBase} bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800`
  const btnDanger = `${btnBase} bg-red-600 hover:bg-red-500 disabled:bg-red-800`
  const cardStyle = 'bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20 shadow-lg'
  const inputStyle = 'w-full rounded-lg px-3 py-2 bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm'
  const labelStyle = 'block text-white/80 text-sm font-medium mb-1'
  const selectStyle = 'w-full rounded-lg px-3 py-2 bg-slate-800 border border-white/30 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm'

  const tabs: { key: TabKey; label: string; description: string }[] = [
    { key: 'admin', label: 'Admin Panel', description: 'Server wallet & credential issuer' },
    { key: 'freelancer', label: 'Freelancer', description: 'Register, credential, DID, inbox' },
    { key: 'client', label: 'Client', description: 'Search, view credentials, pay' },
  ]

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
            Verified Freelancer Marketplace
          </h1>
          <p className="text-indigo-300 text-sm">Challenge 3 -- Full-Stack BSV Simple Application</p>
        </div>

        {/* Status Bar */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-5 border border-white/20">
          <div className="flex items-center gap-3">
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-300 border-t-transparent flex-shrink-0"></div>
            )}
            <p className="text-white/90 text-sm flex-1 truncate">
              {status || 'Ready. Start by creating a server wallet in the Admin panel.'}
            </p>
            {wallet && (
              <span className="text-emerald-400 text-xs flex-shrink-0">Wallet Connected</span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-all border ${
                activeTab === tab.key
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
              }`}
            >
              <div>{tab.label}</div>
              <div className="text-xs font-normal mt-0.5 opacity-70">{tab.description}</div>
            </button>
          ))}
        </div>

        {/* ================================================================ */}
        {/* TAB: Admin Panel */}
        {/* ================================================================ */}
        {activeTab === 'admin' && (
          <div className="space-y-5">

            {/* Server Wallet */}
            <div className={cardStyle}>
              <h2 className="text-white font-bold text-lg mb-3">Server Wallet</h2>
              {serverIdentityKey && (
                <p className="text-white/50 text-xs font-mono mb-3 truncate">
                  Identity: {serverIdentityKey}
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={handleCreateServerWallet} disabled={loading || serverWalletCreated} className={btnPrimary}>
                  {serverWalletCreated ? 'Wallet Active' : 'Create Wallet'}
                </button>
                <button onClick={handleFundServerWallet} disabled={loading || !wallet || !serverWalletCreated} className={btnSuccess}>
                  {serverFunded ? 'Fund Again' : 'Fund Wallet'}
                </button>
                <button onClick={handleServerBalance} disabled={loading || !serverWalletCreated} className={btnSecondary}>
                  Check Balance
                </button>
                <button onClick={handleResetServerWallet} disabled={loading || !serverWalletCreated} className={btnDanger}>
                  Reset Wallet
                </button>
              </div>
              {!wallet && serverWalletCreated && (
                <p className="text-amber-300/80 text-xs mt-3">Connect a wallet (Freelancer or Client tab) to fund the server wallet.</p>
              )}
            </div>

            {/* Credential Issuer */}
            <div className={cardStyle}>
              <h2 className="text-white font-bold text-lg mb-3">Credential Issuer</h2>
              {issuerInfo && (
                <div className="text-white/50 text-xs font-mono mb-3 space-y-1">
                  <p className="truncate">Public Key: {issuerInfo.publicKey}</p>
                  <p>Schemas: {issuerInfo.schemas?.map((s: any) => s.id).join(', ')}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleIssuerInfo} disabled={loading} className={btnPrimary}>
                  {issuerInfo ? 'Refresh Issuer Info' : 'Load Issuer Info'}
                </button>
                <button
                  onClick={async () => {
                    if (!issuerInfo) { setStatus('Load issuer info first'); return }
                    const sn = prompt('Enter credential serial number to check:')
                    if (!sn?.trim()) return
                    setLoading(true)
                    try {
                      const res = await fetch(`/api/credential-issuer?action=status&serialNumber=${encodeURIComponent(sn.trim())}`)
                      const data = await res.json()
                      if (!data.success) throw new Error(data.error)
                      setStatus(`Serial ${sn.trim().substring(0, 20)}... is ${data.revoked ? 'REVOKED' : 'ACTIVE'}`)
                      addResult({ type: 'admin', action: 'check-revocation', success: true, data })
                    } catch (error) {
                      setStatus(`Error: ${(error as Error).message}`)
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading || !issuerInfo}
                  className={btnWarning}
                >
                  Check Revocation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB: Freelancer */}
        {/* ================================================================ */}
        {activeTab === 'freelancer' && (
          <div className="space-y-5">

            {/* Connect & Identity */}
            <div className={cardStyle}>
              <h2 className="text-white font-bold text-lg mb-3">Identity</h2>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleConnectWallet} disabled={loading || wallet !== null} className={btnPrimary}>
                  {wallet ? 'Wallet Connected' : 'Connect Wallet'}
                </button>
                <button onClick={handleRegisterHandle} disabled={loading || !wallet || !!messageBoxHandle} className={btnSuccess}>
                  {messageBoxHandle ? `"${messageBoxHandle}"` : 'Register Handle'}
                </button>
              </div>
              {wallet && (
                <p className="text-white/50 text-xs font-mono mt-3 truncate">
                  Identity: {wallet.getIdentityKey()}
                </p>
              )}
            </div>

            {/* Acquire Credential */}
            <div className={cardStyle}>
              <h2 className="text-white font-bold text-lg mb-3">Acquire Credential</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className={labelStyle}>Full Name *</label>
                  <input
                    type="text"
                    value={credName}
                    onChange={e => setCredName(e.target.value)}
                    placeholder="Alice Smith"
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Primary Skill *</label>
                  <select
                    value={credSkill}
                    onChange={e => setCredSkill(e.target.value)}
                    className={selectStyle}
                  >
                    {SKILL_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>Hourly Rate (sats) *</label>
                  <input
                    type="number"
                    value={credRate}
                    onChange={e => setCredRate(e.target.value)}
                    placeholder="50000"
                    className={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelStyle}>Bio</label>
                  <input
                    type="text"
                    value={credBio}
                    onChange={e => setCredBio(e.target.value)}
                    placeholder="Full-stack developer with 5 years experience"
                    className={inputStyle}
                  />
                </div>
              </div>
              <button
                onClick={handleAcquireCredential}
                disabled={loading || !wallet || !credName.trim() || !credRate.trim()}
                className={`${btnSuccess} w-full`}
              >
                Acquire Credential from Issuer
              </button>
            </div>

            {/* My Credentials */}
            <div className={cardStyle}>
              <h2 className="text-white font-bold text-lg mb-3">My Credentials</h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={handleListCredentials} disabled={loading || !wallet} className={btnSecondary}>
                  List Credentials
                </button>
                <button onClick={handleCreatePresentation} disabled={loading || !wallet || credentials.length === 0} className={btnWarning}>
                  Create Presentation
                </button>
              </div>
              {credentials.length > 0 && (
                <div className="space-y-2">
                  {credentials.map((vc: any, idx: number) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-indigo-300 font-semibold text-sm">
                          {vc.type?.join(', ') || 'Credential'}
                        </span>
                        <span className="text-white/40 text-xs">{vc.issuanceDate?.substring(0, 10)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {vc.credentialSubject && Object.entries(vc.credentialSubject)
                          .filter(([key]) => key !== 'id')
                          .map(([key, val]) => (
                            <div key={key} className="flex gap-1">
                              <span className="text-white/50">{key}:</span>
                              <span className="text-white/90 truncate">{String(val)}</span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DID */}
            <div className={cardStyle}>
              <h2 className="text-white font-bold text-lg mb-3">Decentralized Identity (DID)</h2>
              {createdDID && (
                <p className="text-white/50 text-xs font-mono mb-3 truncate">DID: {createdDID}</p>
              )}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button onClick={handleCreateDID} disabled={loading || !wallet} className={btnPrimary}>
                  Create DID
                </button>
                <button onClick={handleResolveDID} disabled={loading || !wallet || !didToResolve.trim()} className={btnSecondary}>
                  Resolve DID
                </button>
              </div>
              <input
                type="text"
                value={didToResolve}
                onChange={e => setDidToResolve(e.target.value)}
                placeholder="did:bsv:<txid>"
                className={inputStyle}
              />
            </div>

            {/* Inbox */}
            <div className={cardStyle}>
              <h2 className="text-white font-bold text-lg mb-3">
                Payment Inbox
                {incomingPayments.length > 0 && (
                  <span className="ml-2 text-amber-400 text-sm">({incomingPayments.length} pending)</span>
                )}
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button onClick={handleCheckInbox} disabled={loading || !wallet} className={btnSecondary}>
                  Check Inbox
                </button>
                <button onClick={handleAcceptPayment} disabled={loading || !wallet || incomingPayments.length === 0} className={btnSuccess}>
                  Accept Payment
                </button>
              </div>
              {incomingPayments.length > 0 && (
                <div className="space-y-2">
                  {incomingPayments.map((p: any, idx: number) => (
                    <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-white/80">From: {p.sender?.substring(0, 24)}...</span>
                        <span className="text-emerald-400 font-semibold">{p.token?.amount ? `${p.token.amount} sats` : 'Payment'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB: Client */}
        {/* ================================================================ */}
        {activeTab === 'client' && (
          <div className="space-y-5">

            {/* Connect */}
            <div className={cardStyle}>
              <h2 className="text-white font-bold text-lg mb-3">Connect</h2>
              <button onClick={handleConnectWallet} disabled={loading || wallet !== null} className={btnPrimary}>
                {wallet ? 'Wallet Connected' : 'Connect Wallet'}
              </button>
              {wallet && (
                <p className="text-white/50 text-xs font-mono mt-3 truncate">
                  Identity: {wallet.getIdentityKey()}
                </p>
              )}
            </div>

            {/* Search Freelancers */}
            <div className={cardStyle}>
              <h2 className="text-white font-bold text-lg mb-3">Search Freelancers</h2>
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchFreelancers()}
                  placeholder="Search by handle (e.g. alice)"
                  className={`${inputStyle} flex-1`}
                />
                <button onClick={handleSearchFreelancers} disabled={loading || !wallet || !searchQuery.trim()} className={btnPrimary}>
                  Search
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((r: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedRecipient(r)}
                      className={`bg-white/5 rounded-lg p-3 border cursor-pointer transition-all hover:bg-white/10 ${
                        selectedRecipient?.identityKey === r.identityKey
                          ? 'border-indigo-400 bg-indigo-500/10'
                          : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-semibold text-sm">{r.tag}</span>
                          <p className="text-white/40 text-xs font-mono truncate">{r.identityKey}</p>
                        </div>
                        {selectedRecipient?.identityKey === r.identityKey && (
                          <span className="text-indigo-400 text-xs font-semibold">Selected</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Send Payment */}
            {selectedRecipient && (
              <div className={cardStyle}>
                <h2 className="text-white font-bold text-lg mb-3">
                  Send Payment to {selectedRecipient.tag}
                </h2>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className={labelStyle}>Amount (sats)</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      placeholder="5000"
                      className={inputStyle}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleSendPayment}
                      disabled={loading || !wallet || !selectedRecipient || !paymentAmount}
                      className={btnSuccess}
                    >
                      Send Payment
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* Results Panel */}
        {/* ================================================================ */}
        <div className={`${cardStyle} mt-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg">Activity Log</h2>
            {results.length > 0 && (
              <button
                onClick={() => setResults([])}
                className="text-white/40 hover:text-white/70 text-xs transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <p className="text-white/40 text-center py-6 text-sm">No activity yet. Start by creating a server wallet.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border text-sm ${
                    result.success
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-white/50">{result.timestamp}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        result.type === 'admin' ? 'bg-indigo-500/30 text-indigo-300' :
                        result.type === 'freelancer' ? 'bg-emerald-500/30 text-emerald-300' :
                        'bg-amber-500/30 text-amber-300'
                      }`}>
                        {result.type}
                      </span>
                      <span className="text-white/70">{result.action}</span>
                    </div>
                    <span className="text-xs">{result.success ? 'OK' : 'FAIL'}</span>
                  </div>

                  {result.success && result.data && (
                    <div className="mt-1 p-2 bg-black/20 rounded font-mono text-xs text-white/70 overflow-x-auto max-h-32 overflow-y-auto">
                      <pre>{JSON.stringify(result.data, null, 2)}</pre>
                    </div>
                  )}

                  {!result.success && result.error && (
                    <div className="mt-1 p-2 bg-red-900/20 rounded text-xs text-red-300">
                      {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-white/40 text-xs">
          <p>Challenge 3: Verified Freelancer Marketplace -- Built with @bsv/simple</p>
        </div>
      </div>
    </div>
  )
}
