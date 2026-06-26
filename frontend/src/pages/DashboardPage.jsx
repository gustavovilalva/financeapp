import { useState, useEffect } from 'react'
import { dashboardAPI } from '../services/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const fmt = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

export default function DashboardPage() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    dashboardAPI.get(month, year)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false))
  }, [month, year])

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Olá, {user?.name?.split(' ')[0]}! Aqui está seu resumo financeiro.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium capitalize min-w-[130px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <SummaryCard
              title="Saldo Total"
              value={data.total_balance}
              icon={<Wallet size={20} />}
              color="blue"
            />
            <SummaryCard
              title="Receitas"
              value={data.monthly_income}
              icon={<TrendingUp size={20} />}
              color="green"
            />
            <SummaryCard
              title="Despesas"
              value={data.monthly_expenses}
              icon={<TrendingDown size={20} />}
              color="red"
            />
            <SummaryCard
              title="A Pagar"
              value={data.pending_bills}
              icon={<AlertCircle size={20} />}
              color="yellow"
            />
          </div>

          {/* Balance card */}
          <div className={`card flex items-center justify-between ${
            data.monthly_balance >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
          }`}>
            <div>
              <p className="text-sm font-medium text-gray-600">Saldo do mês</p>
              <p className={`text-3xl font-bold mt-1 ${data.monthly_balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {fmt(data.monthly_balance)}
              </p>
            </div>
            {data.monthly_balance >= 0
              ? <TrendingUp size={40} className="text-green-400 opacity-60" />
              : <TrendingDown size={40} className="text-red-400 opacity-60" />
            }
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Expenses by category - Pie */}
            {data.expense_by_category.length > 0 && (
              <div className="card">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Gastos por Categoria</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.expense_by_category}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {data.expense_by_category.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => fmt(val)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
                  {data.expense_by_category.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                        <span>{cat.icon} {cat.name}</span>
                      </div>
                      <span className="font-medium">{fmt(cat.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accounts */}
            <div className="card">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Suas Contas</h2>
              {data.accounts.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhuma conta cadastrada</p>
              ) : (
                <div className="space-y-3">
                  {data.accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                          <Wallet size={16} />
                        </div>
                        <span className="font-medium text-sm">{acc.name}</span>
                      </div>
                      <span className={`font-bold text-sm ${acc.balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {fmt(acc.balance)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Últimos Lançamentos</h2>
            {data.recent_transactions.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Nenhum lançamento ainda. Comece adicionando receitas e despesas!</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.recent_transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                        style={{ background: tx.category?.color ? tx.category.color + '22' : '#f3f4f6' }}>
                        {tx.category?.icon || '💸'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                        <p className="text-xs text-gray-400">
                          {tx.category?.name || '—'} · {format(new Date(tx.date), 'dd/MM', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${tx.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

function SummaryCard({ title, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-500',
    yellow: 'bg-yellow-50 text-yellow-600',
  }
  const textColors = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    red: 'text-red-600',
    yellow: 'text-yellow-700',
  }
  return (
    <div className="card">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]} mb-3`}>
        {icon}
      </div>
      <p className="text-xs text-gray-500 font-medium">{title}</p>
      <p className={`text-lg font-bold mt-0.5 ${textColors[color]}`}>
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
      </p>
    </div>
  )
}
