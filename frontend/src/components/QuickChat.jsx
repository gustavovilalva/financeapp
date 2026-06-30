import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react'
import api from '../services/api'

const SUGGESTIONS = [
  'gastei 50 reais no mercado',
  'paguei 120 reais de gasolina',
  'recebi 3000 de salário',
  'almocei por 35 reais',
]

export default function QuickChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Olá! Me diga o que gastou ou recebeu e eu cadastro na hora. Ex: "gastei 80 reais com pizza" 🍕',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: msg }])
    setLoading(true)
    try {
      const res = await api.post('/api/chat/', { message: msg })
      setMessages((prev) => [...prev, { role: 'assistant', text: res.data.message, success: res.data.success }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: '❌ Erro ao processar. Tente novamente.', success: false },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg flex items-center justify-center transition-all active:scale-95"
        title="Lançamento rápido"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-36 right-4 md:bottom-24 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ maxHeight: '70vh' }}>
          <div className="bg-green-600 text-white px-4 py-3 flex items-center gap-2">
            <Sparkles size={18} />
            <div>
              <p className="font-semibold text-sm">Lançamento Rápido</p>
              <p className="text-xs text-green-200">Powered by Gemini AI</p>
            </div>
            <button onClick={() => setOpen(false)} className="ml-auto p-1 hover:bg-green-700 rounded-lg">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50" style={{ minHeight: 200 }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-green-600 text-white rounded-br-sm'
                      : m.success === false
                      ? 'bg-red-50 text-red-700 border border-red-100 rounded-bl-sm'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm border border-gray-100">
                  <Loader2 size={16} className="animate-spin text-green-600" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-3 pt-2 flex flex-wrap gap-1 bg-gray-50">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs bg-white border border-gray-200 rounded-full px-2 py-1 text-gray-600 hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="p-3 border-t border-gray-100 bg-white flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ex: gastei 80 reais com pizza..."
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-gray-200 text-white rounded-xl transition-colors flex-shrink-0"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
