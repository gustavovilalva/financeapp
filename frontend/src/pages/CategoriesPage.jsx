import { useState, useEffect } from 'react'
import { categoriesAPI } from '../services/api'
import { Plus, Trash2, X } from 'lucide-react'

const ICONS = ['💰', '💼', '🏠', '🛒', '🍔', '⛽', '💊', '👕', '📺', '🎉', '📚', '⚠️', '💻', '📈', '🚗', '✈️', '🏋️', '🎮', '🐾', '🎁', '🔧', '📱', '🏥', '🎓']
const COLORS = ['#10b981', '#ef4444', '#f97316', '#eab308', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#f43f5e', '#84cc16', '#0ea5e9', '#94a3b8', '#f59e0b']

function CategoryModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', type: 'expense', icon: '💰', color: '#6366f1' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await categoriesAPI.create(form)
      onSaved()
      onClose()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao criar categoria')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Nova Categoria</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" placeholder="Ex: Academia, Pets..." value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Tipo *</label>
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              <button type="button" onClick={() => setForm(f => ({ ...f, type: 'income' }))}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.type === 'income' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                ✅ Receita
              </button>
              <button type="button" onClick={() => setForm(f => ({ ...f, type: 'expense' }))}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${form.type === 'expense' ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                💸 Despesa
              </button>
            </div>
          </div>
          <div>
            <label className="label">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((icon) => (
                <button key={icon} type="button" onClick={() => setForm(f => ({ ...f, icon }))}
                  className={`w-10 h-10 text-xl rounded-xl flex items-center justify-center transition-colors ${form.icon === icon ? 'bg-indigo-100 ring-2 ring-indigo-500' : 'hover:bg-gray-100'}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))}
                  className={`w-8 h-8 rounded-full transition-transform ${form.color === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ background: color }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Salvando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [modal, setModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('expense')

  const load = () => {
    setLoading(true)
    categoriesAPI.list().then((res) => { setCategories(res.data); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id) => {
    if (!confirm('Excluir esta categoria?')) return
    try {
      await categoriesAPI.delete(id)
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Não foi possível excluir')
    }
  }

  const filtered = categories.filter((c) => c.type === tab)

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nova
        </button>
      </div>

      <div className="flex rounded-xl overflow-hidden border border-gray-200 w-fit">
        <button onClick={() => setTab('expense')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'expense' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          💸 Despesas
        </button>
        <button onClick={() => setTab('income')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${tab === 'income' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          ✅ Receitas
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((cat) => (
            <div key={cat.id} className="card relative group flex flex-col items-center gap-2 py-5 text-center">
              {!cat.is_default && (
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: cat.color + '22' }}>
                {cat.icon}
              </div>
              <p className="text-xs font-medium text-gray-700 leading-tight">{cat.name}</p>
              {cat.is_default && (
                <span className="text-xs text-gray-300">padrão</span>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && <CategoryModal onClose={() => setModal(false)} onSaved={load} />}
    </div>
  )
}
