import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { transactionsAPI, categoriesAPI, accountsAPI } from '../services/api'
import { format } from 'date-fns'

export default function TransactionModal({ transaction, onClose, onSaved }) {
  const isEdit = !!transaction?.id
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: transaction?.type || 'expense',
    account_id: transaction?.account_id || '',
    category_id: transaction?.category_id || '',
    amount: transaction?.amount || '',
    description: transaction?.description || '',
    date: transaction?.date ? format(new Date(transaction.date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    notes: transaction?.notes || '',
  })

  useEffect(() => {
    Promise.all([categoriesAPI.list(), accountsAPI.list()]).then(([cats, accs]) => {
      setCategories(cats.data)
      setAccounts(accs.data)
      if (!form.account_id && accs.data.length > 0) {
        setForm(f => ({ ...f, account_id: accs.data[0].id }))
      }
    })
  }, [])

  const filteredCats = categories.filter((c) => c.type === form.type)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        account_id: parseInt(form.account_id),
        category_id: form.category_id ? parseInt(form.category_id) : null,
        date: new Date(form.date).toISOString(),
      }
      if (isEdit) {
        await transactionsAPI.update(transaction.id, payload)
      } else {
        await transactionsAPI.create(payload)
      }
      onSaved()
      onClose()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao salvar lançamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-base font-semibold">{isEdit ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, type: 'income', category_id: '' }))}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                form.type === 'income' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              ✅ Receita
            </button>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, type: 'expense', category_id: '' }))}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                form.type === 'expense' ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              💸 Despesa
            </button>
          </div>

          <div>
            <label className="label">Descrição *</label>
            <input
              className="input"
              placeholder="Ex: Salário, Mercado..."
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Valor (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="input"
              placeholder="0,00"
              value={form.amount}
              onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Data *</label>
            <input
              type="datetime-local"
              className="input"
              value={form.date}
              onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Conta *</label>
            <select
              className="input"
              value={form.account_id}
              onChange={(e) => setForm(f => ({ ...f, account_id: e.target.value }))}
              required
            >
              <option value="">Selecione a conta</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Categoria</label>
            <select
              className="input"
              value={form.category_id}
              onChange={(e) => setForm(f => ({ ...f, category_id: e.target.value }))}
            >
              <option value="">Sem categoria</option>
              {filteredCats.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Opcional..."
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            />
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
