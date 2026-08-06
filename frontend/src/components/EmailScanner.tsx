import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { apiUrl } from '../api'

type EmailScanReport = {
  report_id: number
  report: {
    subject?: string
    from?: string
    to?: string
    dkim?: {
      present: boolean
      domain?: string
      selector?: string
      reason?: string
    }
    spf_check?: {
      domain?: string
      record?: string | null
      status?: string
      reason?: string
    }
    received_spf?: string
    authentication_results?: string
    grammar?: {
      issues: string[]
      score: number
    }
    link_analysis?: {
      links: string[]
      suspicious_links: Array<{ url: string; reason: string }>
    }
    ai_explanation?: string
    headers?: Record<string, string>
    body?: string
    sender_domain?: string
    return_path?: string
    message_id?: string
  }
}

type EmailHistoryItem = {
  id: number
  subject: string
  classification: string
  risk_score: number
  created_at: string
}

const suspiciousPill = (label: string) => (
  <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/50 dark:text-red-200">{label}</span>
)

export default function EmailScanner() {
  const [emailText, setEmailText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [history, setHistory] = useState<EmailHistoryItem[]>([])
  const [scanResult, setScanResult] = useState<EmailScanReport | null>(null)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    try {
      const response = await fetch(apiUrl('/scanner/email-history'))
      if (!response.ok) return
      const payload = (await response.json()) as EmailHistoryItem[]
      setHistory(payload)
    } catch {
      // ignore
    }
  }

  function pickFile() {
    fileInputRef.current?.click()
  }

  function handleFileChange(files: FileList | null) {
    if (!files?.length) return
    const nextFile = files[0]
    setSelectedFile(nextFile)
    setFileName(nextFile.name)
    setEmailText('')
    setScanResult(null)
    setStatus('Ready to scan uploaded email')
  }

  async function scanEmail() {
    if (!emailText.trim() && !selectedFile) {
      setStatus('Paste an email or upload a .eml file first')
      return
    }
    setLoading(true)
    setStatus('Analyzing email...')
    setScanResult(null)
    const form = new FormData()
    if (selectedFile) {
      form.append('file', selectedFile)
    } else {
      form.append('email_text', emailText)
    }

    try {
      const response = await fetch(apiUrl('/scanner/email-scan'), {
        method: 'POST',
        body: form,
      })
      const payload = await response.json()
      if (!response.ok) {
        setStatus(payload.detail || 'Email scan failed')
        return
      }
      setScanResult(payload as EmailScanReport)
      setStatus('Email scan complete')
      await loadHistory()
    } catch (error) {
      setStatus('Unable to reach the backend scanner')
    } finally {
      setLoading(false)
    }
  }

  async function downloadReport() {
    if (!scanResult) return
    const response = await fetch(apiUrl(`/scanner/email-report/${scanResult.report_id}/download`))
    if (!response.ok) {
      setStatus('Failed to download report')
      return
    }
    const blob = await response.blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `email-scan-report-${scanResult.report_id}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Email Phishing Detector</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Paste raw email content or upload an .eml file for phishing analysis.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Paste raw email source</label>
            <textarea
              value={emailText}
              onChange={event => {
                setEmailText(event.target.value)
                setSelectedFile(null)
                setFileName(null)
              }}
              rows={14}
              className="mt-3 w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
              placeholder="From: ...\nTo: ...\nSubject: ...\n\n..."
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={scanEmail}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? 'Analyzing...' : 'Analyze email'}
              </button>
              <button
                type="button"
                onClick={pickFile}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600"
              >
                Upload .eml file
              </button>
              <input ref={fileInputRef} type="file" hidden accept=".eml" onChange={event => handleFileChange(event.target.files)} />
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">A .eml file will override pasted input for analysis.</p>
            {fileName && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Selected file: {fileName}</p>}
            {status && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{status}</p>}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">History</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">Recent email scans</h3>
              </div>
            </div>
            {history.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">No recent email scans yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {history.slice(0, 8).map(item => (
                  <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{item.subject}</p>
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
              <p className="text-sm text-slate-500 dark:text-slate-400">Email phishing result</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{scanResult.report.subject || 'Untitled email'}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">From: {scanResult.report.from || 'Unknown'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
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
              <p className="text-sm text-slate-500 dark:text-slate-400">DKIM</p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{scanResult.report.dkim?.present ? 'Present' : 'Missing'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">SPF status</p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{scanResult.report.spf_check?.status || 'Unknown'}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI explanation</h4>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{scanResult.report.ai_explanation || 'No explanation available.'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Header summary</h4>
              <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p><strong>From:</strong> {scanResult.report.from || 'N/A'}</p>
                <p><strong>To:</strong> {scanResult.report.to || 'N/A'}</p>
                <p><strong>Message-ID:</strong> {scanResult.report.message_id || 'N/A'}</p>
                <p><strong>Return-Path:</strong> {scanResult.report.return_path || 'N/A'}</p>
                <p><strong>Authentication:</strong> {scanResult.report.authentication_results || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Suspicious links</h4>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {scanResult.report.link_analysis?.suspicious_links?.length ? (
                  scanResult.report.link_analysis.suspicious_links.map((item, index) => (
                    <div key={index} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{item.url}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.reason}</p>
                    </div>
                  ))
                ) : (
                  <p>No suspicious links detected.</p>
                )}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Grammar analysis</h4>
              <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <p><strong>Score:</strong> {scanResult.report.grammar?.score ?? 0}</p>
                {scanResult.report.grammar?.issues?.length ? (
                  <ul className="list-disc space-y-1 pl-5">
                    {scanResult.report.grammar.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No obvious grammar issues detected.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Parsed headers</h4>
            <div className="mt-4 overflow-auto rounded-2xl bg-slate-900/5 p-3 text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-100">
              <pre>{JSON.stringify(scanResult.report.headers, null, 2)}</pre>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
