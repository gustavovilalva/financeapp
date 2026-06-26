import { useState, useEffect } from 'react'
import { billsAPI, categoriesAPI } from '../services/api'
import { format, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Pencil, Trash2, CheckCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

function BillModal({ bill, onClose, onSaved }) {
  const isEdit = !!bill?.id
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    description: bill?.description || '',
    amount: bill?.amount || '',
    due_date: bill?.due_date ? format(new Date(bill.due_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    category_id: bill?.category_id || '',
    recurring: bill?.recurring || false,
    recurring_day: bill?.recurring_day || '',
    notes: bill?.notes || '',
  })

  useEffect(() => {
    categoriesAPI.list().then((res) =>
      setCategories(res.data.filter((c) => c.type === 'expense'))
    )
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        category_id: form.category_id ? parseInt(form.category_id) : null,
        recurring_day: form.recurring_day ? parseInt(form.recurring_day) : null,
        due_date: new Date(form.due_date + 'T12:00:00').toISOString(),
      }
      if (isEdit) await billsAPI.update(bill.id, payload)
      else await billsAPI.create(payload)
      onSaved()
      onClose()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{isEdit ? 'Editar Conta' : 'Nova Conta a Pagar'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="label">Descrição *</label>
            <input className="input" placeholder="Ex: Aluguel, Netflix..." value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Valor *</label>
            <input type="number" step="0.01" min="0.01" className="input" placeholder="0,00"
              value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Vencimento *</label>
            <input type="date" className="input" value={form.due_date}
              onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Categoria</label>
            <select className="input" value={form.category_id} onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}>
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded accent-green-600"
              checked={form.recurring} onChange={(e) => setForm(f => ({ ...f, recurring: e.target.checked }))} />
            <span className="text-sm text-gray-700">Conta recorrente (mensal)</span>
          </label>
          {form.recurring && (
            <div>
              <label className="label">Dia de vencimento</label>
              <input type="number" min="1" max="31" className="input" placeholder="Ex: 10"
                value={form.recurring_day} onChange={(e) => setForm(f => ({ ...f, recurring_day: e.target.value }))} />
            </div>
          )}
          <div>
            <label className="label">Observações</label>
            <textarea className="input resize-none" rows={2} placeholder="Opcional..."
              value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const STATUS_LABELS = {
  pending: { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Pago', cls: 'bg-green-100 text-green-700' },
  overdue: { label: 'Vencido', cls: 'bg-red-100 text-red-600' },
}

export default function BillsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')

  const load = () => {
    setLoading(true)
    billsAPI.list({ month, year }).then((res) => {
      setBills(res.data)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [month, year])

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const handleDelete = async (id) => {
    if (!confirm('Excluir esta conta?')) return
    await billsAPI.delete(id)
    load()
  }

  const handleMarkPaid = async (bill) => {
    await billsAPI.update(bill.id, { status: bill.status === 'paid' ? 'pending' : 'paid' })
    load()
  }

  const filtered = bills.filter(b => filterStatus === 'all' || b.status === filterStatus)
  const totalPending = bills.filter(b => b.status === 'pending').reduce((s, b) => s + b.amount, 0)
  const totalPaid = bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount, 0)
  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Contas a Pagar</h1>
        <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nova conta
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronLeft size={18} /></button>
        <span className="text-sm font-medium capitalize min-w-[130px] text-center">{monthLabel}</span>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronRight size={18} /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card bg-yellow-50 border-yellow-100">
          <p className="text-xs text-gray-500">A pagar</p>
          <p className="font-bold text-yellow-700 text-base mt-0.5">{fmt(totalPending)}</p>
        </div>
        <div className="card bg-green-50 border-green-100">
          <p className="text-xs text-gray-500">Já pago</p>
          <p className="font-bold text-green-700 text-base mt-0.5">{fmt(totalPaid)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {[['all', 'Todas'], ['pending', 'Pendentes'], ['paid', 'Pagas'], ['overdue', 'Vencidas']].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              filterStatus === v ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {l}
          </button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🎉</p>
            <p className="text-sm">Nenhuma conta encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((bill) => {
              const overdue = bill.status === 'pending' && isPast(new Date(bill.due_date))
              const status = overdue ? 'overdue' : bill.status
              const s = STATUS_LABELS[status]
              return (
                <div key={bill.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <button onClick={() => handleMarkPaid(bill)}
                    className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                      bill.status === 'paid' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-500'
                    }`}>
                    {bill.status === 'paid' && <CheckCircle size={16} />}
                  </button>
                  <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-base"
                    style={{ background: (bill.category?.color || '#94a3b8') + '22' }}>
                    {bill.category?.icon || '📄'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${bill.status === 'paid' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {bill.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">
                        Vence {format(new Date(bill.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                        {bill.recurring && ' · 🔁 Recorrente'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="font-bold text-sm text-gray-900">{fmt(bill.amount)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setModal(bill)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(bill.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal !== null && (
        <BillModal bill={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={load} />
      )}
    </div>
  )
}
