import { useState, useEffect } from 'react'
import { transactionsAPI } from '../services/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import TransactionModal from '../components/TransactionModal'

const fmt = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

export default function TransactionsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [filter, setFilter] = useState('all') // all | income | expense
  const [search, setSearch] = useState('')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | transaction object

  const load = () => {
    setLoading(true)
    transactionsAPI.list({ month, year }).then((res) => {
      setTransactions(res.data)
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [month, year])

  const filtered = transactions.filter((t) => {
    if (filter !== 'all' && t.type !== filter) return false
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const handleDelete = async (id) => {
    if (!confirm('Excluir este lançamento?')) return
    await transactionsAPI.delete(id)
    load()
  }

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Lançamentos</h1>
        <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Novo lançamento
        </button>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-2">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium capitalize min-w-[130px] text-center">{monthLabel}</span>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card bg-green-50 border-green-100">
          <p className="text-xs text-gray-500">Receitas</p>
          <p className="font-bold text-green-700 text-sm sm:text-base mt-0.5">{fmt(totalIncome)}</p>
        </div>
        <div className="card bg-red-50 border-red-100">
          <p className="text-xs text-gray-500">Despesas</p>
          <p className="font-bold text-red-600 text-sm sm:text-base mt-0.5">{fmt(totalExpense)}</p>
        </div>
        <div className={`card ${totalIncome - totalExpense >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
          <p className="text-xs text-gray-500">Saldo</p>
          <p className={`font-bold text-sm sm:text-base mt-0.5 ${totalIncome - totalExpense >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
            {fmt(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'Todos'], ['income', '✅ Receitas'], ['expense', '💸 Despesas']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              filter === v ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {l}
          </button>
        ))}
        <div className="relative flex-1 min-w-[150px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8 py-1.5 text-sm"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-sm">Nenhum lançamento encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                  style={{ background: (tx.category?.color || '#94a3b8') + '22' }}
                >
                  {tx.category?.icon || '💸'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                  <p className="text-xs text-gray-400">
                    {tx.category?.name || 'Sem categoria'} · {format(new Date(tx.date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ${tx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setModal(tx)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(tx.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(modal !== null) && (
        <TransactionModal
          transaction={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
