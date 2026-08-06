import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { apiUrl } from '../api'

type AssistantHistoryItem = {
  id: number
  user_message: string
  assistant_response: string
  created_at: string
}

type SuggestedPrompt = {
  text: string
}

type KnowledgeBaseEntry = {
  title: string
  summary: string
  source_url?: string
}

function renderMarkdown(markdown: string) {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

  let html = escapeHtml(markdown)
  html = html.replace(/```([\s\S]*?)```/g, '<pre class="rounded-2xl bg-slate-900 p-4 text-sm text-slate-100"><code>$1</code></pre>')
  html = html.replace(/`([^`]+)`/g, '<code class="rounded px-1 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100">$1</code>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-blue-600 hover:underline dark:text-blue-400">$1</a>')
  html = html.replace(/^###\s+(.*)$/gm, '<h3 class="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">$1</h3>')
  html = html.replace(/^##\s+(.*)$/gm, '<h2 class="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">$1</h2>')
  html = html.replace(/^#\s+(.*)$/gm, '<h1 class="mt-4 text-2xl font-semibold text-slate-900 dark:text-slate-100">$1</h1>')
  html = html.replace(/\n{2,}/g, '</p><p>')
  html = `<p class="leading-7 text-slate-700 dark:text-slate-300">${html}</p>`
  return html
}

export default function Assistant() {
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [assistantResponse, setAssistantResponse] = useState('')
  const [history, setHistory] = useState<AssistantHistoryItem[]>([])
  const [prompts, setPrompts] = useState<SuggestedPrompt[]>([])
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseEntry[]>([])

  useEffect(() => {
    loadAssistantState()
  }, [])

  async function loadAssistantState() {
    try {
      const [historyResponse, promptsResponse, knowledgeResponse] = await Promise.all([
        fetch(apiUrl('/assistant/history')),
        fetch(apiUrl('/assistant/prompts')),
        fetch(apiUrl('/assistant/knowledge-base')),
      ])

      if (historyResponse.ok) {
        setHistory((await historyResponse.json()) as AssistantHistoryItem[])
      }
      if (promptsResponse.ok) {
        setPrompts((await promptsResponse.json()) as SuggestedPrompt[])
      }
      if (knowledgeResponse.ok) {
        setKnowledgeBase((await knowledgeResponse.json()) as KnowledgeBaseEntry[])
      }
    } catch {
      // ignore initial load failures
    }
  }

  async function sendMessage(text?: string) {
    const content = (text ?? message).trim()
    if (!content) {
      setStatus('Enter a question or prompt.')
      return
    }

    setStatus('Sending to AI assistant...')
    setLoading(true)
    setAssistantResponse('')

    try {
      const response = await fetch(apiUrl('/assistant/message-stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setStatus(payload?.detail || 'AI assistant request failed')
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let done = false
        while (!done) {
          const chunk = await reader.read()
          done = chunk.done ?? true
          if (chunk.value) {
            setAssistantResponse(prev => prev + decoder.decode(chunk.value, { stream: !done }))
          }
        }
      } else {
        setAssistantResponse(await response.text())
      }

      setStatus('Response received')
      await loadAssistantState()
    } catch {
      setStatus('Unable to reach the AI assistant backend.')
    } finally {
      setLoading(false)
      setMessage('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">AI Cybersecurity Assistant</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Ask questions, get markdown-aware security guidance, and review conversation history.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_0.85fr]">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Ask the assistant</label>
            <textarea
              value={message}
              onChange={event => setMessage(event.target.value)}
              rows={5}
              className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
              placeholder="e.g. What do I do if I suspect a phishing campaign?"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? 'Thinking...' : 'Send to assistant'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMessage('')
                  setAssistantResponse('')
                  setStatus('')
                }}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600"
              >
                Reset
              </button>
            </div>
            {status && <p className="text-sm text-slate-500 dark:text-slate-400">{status}</p>}
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Suggested prompts</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {prompts.map(prompt => (
                  <button
                    key={prompt.text}
                    onClick={() => {
                      setMessage(prompt.text)
                      sendMessage(prompt.text)
                    }}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
                  >
                    {prompt.text}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Cybersecurity knowledge base</h3>
              <div className="mt-4 space-y-4">
                {knowledgeBase.map(entry => (
                  <div key={entry.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">{entry.title}</h4>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{entry.summary}</p>
                    {entry.source_url && (
                      <a href={entry.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
                        Learn more
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Assistant response</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Live stream</h3>
            </div>
          </div>
          <div className="mt-6 min-h-[250px] rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm leading-7 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            {assistantResponse ? (
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(assistantResponse) }} />
            ) : (
              <p className="text-slate-500 dark:text-slate-400">Send a prompt to start the assistant conversation.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Conversation history</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Recent exchanges</h3>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {history.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">No previous conversations yet.</p>
            ) : (
              history.map(entry => (
                <div key={entry.id} className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">You asked:</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{entry.user_message}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Assistant replied:</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{entry.assistant_response}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(entry.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
