import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { apiUrl } from '../api'

type URLScanReport = {
  report_id: number
  report: {
    original_url: string
    normalized_url: string
    final_url?: string
    domain?: string
    classification: string
    risk_score: number
    ssl?: {
      applicable: boolean
      valid: boolean
      issuer?: Record<string, string>
      subject?: Record<string, string>
      subject_alt_names?: string[]
      error?: string
    }
    redirect_chain?: Array<{ url: string; status_code?: number }>
    domain_reputation?: {
      score: number
      verdict: string
      reasons: string[]
    }
    phishing?: {
      score: number
      verdict: string
      matches: string[]
    }
    suspicious_keywords?: {
      matched_keywords: string[]
    }
    response?: {
      status_code?: number
      content_type?: string
      content_length?: string
      page_title?: string
    }
    ai_explanation?: string
    error?: string
  }
}

type URLHistoryItem = {
  id: number
  url: string
  classification: string
  risk_score: number
  created_at: string
}

export default function URLScanner() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanResult, setScanResult] = useState<URLScanReport | null>(null)
  const [reportId, setReportId] = useState<number | null>(null)
  const [history, setHistory] = useState<URLHistoryItem[]>([])

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    try {
      const response = await fetch(apiUrl('/scanner/url-history'))
      if (!response.ok) {
        return
      }
      const payload = (await response.json()) as URLHistoryItem[]
      setHistory(payload)
    } catch {
      // ignore history failures
    }
  }

  async function scanUrl() {
    const trimmed = url.trim()
    if (!trimmed) {
      setStatus('Enter a URL to scan')
      return
    }

    setLoading(true)
    setStatus('Analyzing URL...')
    setScanResult(null)
    setReportId(null)

    try {
      const response = await fetch(apiUrl('/scanner/url-scan'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })

      const payload = await response.json()
      if (!response.ok) {
        setStatus(payload.detail || 'URL scan failed')
        return
      }

      setScanResult(payload as URLScanReport)
      setReportId(payload.report_id)
      setStatus('Scan complete')
      await loadHistory()
    } catch (error) {
      setStatus('Unable to reach the backend scanner')
    } finally {
      setLoading(false)
    }
  }

  async function downloadReport() {
    if (!reportId) {
      return
    }
    const response = await fetch(apiUrl(`/scanner/url-report/${reportId}/download`))
    if (!response.ok) {
      setStatus('Failed to download report')
      return
    }
    const blob = await response.blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `url-scan-report-${reportId}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">URL Threat Scanner</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Analyze URLs for SSL, redirects, domain reputation, phishing signals, and AI insights.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Enter a URL</label>
            <input
              value={url}
              onChange={event => setUrl(event.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
              placeholder="https://example.com/login"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={scanUrl}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? 'Scanning...' : 'Scan URL'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrl('')
                  setStatus('')
                  setScanResult(null)
                }}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600"
              >
                Reset
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">Historical results are stored and displayed on the right once a URL scan completes.</p>
            {status && <p className="text-sm text-slate-500 dark:text-slate-400">{status}</p>}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Scan history</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Recent URL checks</h3>
              </div>
            </div>

            {history.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">No recent URL scans yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {history.slice(0, 8).map(item => (
                  <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{item.url}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>{item.classification}</span>
                      <span>Risk {item.risk_score}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {scanResult && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">URL scan summary</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{scanResult.report.original_url}</h3>
              {scanResult.report.final_url && scanResult.report.final_url !== scanResult.report.original_url && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Final destination: {scanResult.report.final_url}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadReport}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-950 dark:hover:bg-slate-300"
              >
                Download report
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">Classification</p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{scanResult.report.classification}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">Risk score</p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{scanResult.report.risk_score}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">SSL status</p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
                {scanResult.report.ssl?.applicable ? (scanResult.report.ssl?.valid ? 'Valid' : 'Invalid') : 'N/A'}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">Redirects</p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{scanResult.report.redirect_chain?.length ?? 0}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI explanation</h4>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{scanResult.report.ai_explanation || 'No explanation available.'}</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Domain reputation</h4>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p><strong>Domain:</strong> {scanResult.report.domain || 'Unknown'}</p>
                <p><strong>Score:</strong> {scanResult.report.domain_reputation?.score ?? 'N/A'}</p>
                <p><strong>Verdict:</strong> {scanResult.report.domain_reputation?.verdict ?? 'N/A'}</p>
                <p><strong>Reasons:</strong> {scanResult.report.domain_reputation?.reasons.join(', ') || 'None'}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Phishing analysis</h4>
              <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p><strong>Score:</strong> {scanResult.report.phishing?.score ?? 'N/A'}</p>
                <p><strong>Verdict:</strong> {scanResult.report.phishing?.verdict ?? 'N/A'}</p>
                <p><strong>Matches:</strong> {scanResult.report.phishing?.matches.join(', ') || 'None'}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Suspicious keywords</h4>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{scanResult.report.suspicious_keywords?.matched_keywords.join(', ') || 'None detected'}</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Redirect chain</h4>
            <div className="mt-4 overflow-auto text-sm text-slate-600 dark:text-slate-300">
              {scanResult.report.redirect_chain?.length ? (
                <ol className="space-y-2">
                  {scanResult.report.redirect_chain.map((item, idx) => (
                    <li key={idx} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{item.url}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Status: {item.status_code ?? 'unknown'}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">No redirect information available.</p>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">SSL details</h4>
            {scanResult.report.ssl ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2 text-sm text-slate-600 dark:text-slate-300">
                <div>
                  <p><strong>Valid:</strong> {scanResult.report.ssl.valid ? 'Yes' : 'No'}</p>
                  <p><strong>Issuer:</strong> {scanResult.report.ssl.issuer ? JSON.stringify(scanResult.report.ssl.issuer) : 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Subject:</strong> {scanResult.report.ssl.subject ? JSON.stringify(scanResult.report.ssl.subject) : 'N/A'}</p>
                  <p><strong>Errors:</strong> {scanResult.report.ssl.error || 'None'}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">SSL scan is not available for this URL.</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
