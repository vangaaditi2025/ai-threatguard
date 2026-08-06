import { DragEvent, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { apiUrl } from '../api'

type ScanReport = {
  report_id: number
  report: {
    filename: string
    file_type: string
    classification: string
    risk_score: number
    reasons: string[]
    metadata: Record<string, unknown>
    virus_total?: Record<string, unknown>
  }
}

export default function FileScanner() {
  const [file, setFile] = useState<File | null>(null)
  const [hovering, setHovering] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scanResult, setScanResult] = useState<ScanReport | null>(null)
  const [status, setStatus] = useState('')
  const [reportId, setReportId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  function openFileDialog() {
    inputRef.current?.click()
  }

  function handleFile(fileList: FileList | null) {
    if (!fileList?.length) {
      return
    }
    const nextFile = fileList[0]
    setFile(nextFile)
    setScanResult(null)
    setStatus('Ready to scan')
    setProgress(0)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setHovering(false)
    handleFile(event.dataTransfer.files)
  }

  async function uploadFile() {
    if (!file) {
      setStatus('Select a file first')
      return
    }
    setStatus('Uploading...')
    setProgress(0)
    const form = new FormData()
    form.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', apiUrl('/scanner/scan'))
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const payload = JSON.parse(xhr.responseText) as ScanReport
        setScanResult(payload)
        setReportId(payload.report_id)
        setStatus('Scan complete')
        setProgress(100)
      } else {
        let message = 'Upload failed'
        try {
          const payload = JSON.parse(xhr.responseText)
          message = payload.detail || message
        } catch {
          // ignore parse errors
        }
        setStatus(message)
      }
    }
    xhr.onerror = () => {
      setStatus('Network error during upload')
    }
    xhr.send(form)
  }

  async function downloadReport() {
    if (!reportId) {
      return
    }
    const response = await fetch(apiUrl(`/scanner/report/${reportId}/download`))
    if (!response.ok) {
      setStatus('Failed to download report')
      return
    }

    const blob = await response.blob()
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `scan-report-${reportId}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">File Threat Scanner</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Drag files here or browse to generate a threat report.</p>

        <div
          onDragOver={event => {
            event.preventDefault()
            setHovering(true)
          }}
          onDragLeave={() => setHovering(false)}
          onDrop={handleDrop}
          className={`mt-6 rounded-3xl border-2 p-8 text-center transition ${hovering ? 'border-blue-500 bg-blue-50/60 dark:border-blue-400 dark:bg-blue-900/20' : 'border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/80'}`}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={event => handleFile(event.target.files)}
            accept=".pdf,.docx,.zip,.exe,image/*"
          />
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Drop a file to scan</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">PDF, DOCX, ZIP, EXE, and image formats are supported.</p>
          <button type="button" onClick={openFileDialog} className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-950 dark:hover:bg-slate-300">
            Browse files
          </button>
        </div>

        {file && (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Selected file</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{file.name} · {(file.size / 1024).toFixed(1)} KB</p>
            <button onClick={uploadFile} className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
              Scan file
            </button>
          </div>
        )}

        {progress > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-sm text-slate-600 dark:text-slate-400">Upload progress</div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">{progress}%</div>
          </div>
        )}

        {status && <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{status}</p>}
      </div>

      {scanResult && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Scan summary</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{scanResult.report.filename}</h3>
            </div>
            <button onClick={downloadReport} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-950 dark:hover:bg-slate-300">
              Download report
            </button>
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
              <p className="text-sm text-slate-500 dark:text-slate-400">File type</p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{scanResult.report.file_type}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">VirusTotal</p>
              <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">{scanResult.report.virus_total?.verdict ?? 'N/A'}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Details</h4>
              <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li><strong>Filename:</strong> {scanResult.report.filename}</li>
                <li><strong>Type:</strong> {scanResult.report.file_type}</li>
                <li><strong>Classification:</strong> {scanResult.report.classification}</li>
                <li><strong>Risk score:</strong> {scanResult.report.risk_score}</li>
                <li><strong>Reasons:</strong> {scanResult.report.reasons.join(', ')}</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Metadata</h4>
              <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-slate-900/5 p-3 text-xs text-slate-700 dark:bg-slate-950 dark:text-slate-100">
                {JSON.stringify(scanResult.report.metadata, null, 2)}
              </pre>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
