import { useState, useEffect } from 'react'
import { accountsAPI } from '../services/api'
import { Plus, Pencil, Trash2, X, Wallet } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

function AccountModal({ account, onClose, onSaved }) {
  const isEdit = !!account?.id
  const [form, setForm] = useState({ name: account?.name || '', balance: account?.balance ?? '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { name: form.name, balance: parseFloat(form.balance) }
      if (isEdit) await accountsAPI.update(account.id, payload)
      else await accountsAPI.create(payload)
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
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="border-b border-gray-100 px-4 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{isEdit ? 'Editar Conta' : 'Nova Conta'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="label">Nome da conta *</label>
            <input className="input" placeholder="Ex: Nubank, Bradesco, Dinheiro..."
              value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Saldo atual (R$)</label>
            <input type="number" step="0.01" className="input" placeholder="0,00"
              value={form.balance} onChange={(e) => setForm(f => ({ ...f, balance: e.target.value }))} />
            <p className="text-xs text-gray-400 mt-1">
              {isEdit
                ? 'Atenção: alterar o saldo aqui não cria lançamentos. Use para correções.'
                : 'Informe o saldo atual da sua conta.'}
            </p>
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

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  const load = () => {
    setLoading(true)
    accountsAPI.list().then((res) => { setAccounts(res.data); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Excluir esta conta? Todos os lançamentos associados também serão excluídos.')) return
    await accountsAPI.delete(id)
    load()
  }

  const total = accounts.reduce((s, a) => s + a.balance, 0)

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Minhas Contas</h1>
        <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nova conta
        </button>
      </div>

      <div className="card bg-gradient-to-r from-green-600 to-emerald-500 border-0 text-white">
        <p className="text-sm text-green-100">Patrimônio total</p>
        <p className="text-3xl font-bold mt-1">{fmt(total)}</p>
        <p className="text-xs text-green-200 mt-1">{accounts.length} conta{accounts.length !== 1 ? 's' : ''} cadastrada{accounts.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <Wallet size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma conta cadastrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="card flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Wallet size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{acc.name}</p>
                <p className="text-xs text-gray-400">Conta bancária</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${acc.balance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {fmt(acc.balance)}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setModal(acc)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-700 transition-colors">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(acc.id)} className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <AccountModal account={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={load} />
      )}
    </div>
  )
}
