import { useState, useEffect, useMemo } from 'react'
import { Plus, X, Shield, Pencil } from 'lucide-react'

export function AccessManagement({ currentUserEmail }: any) {
  const [acessos, setAcessos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [novoEmail, setNovoEmail] = useState('')
  const [novoPerfil, setNovoPerfil] = useState('editor')
  const [saving, setSaving] = useState(false)

  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

  const loadAcessos = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${url}/rest/v1/permissoes_usuarios?select=*&order=created_at.desc&limit=1000`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
      const data = await res.json()
      setAcessos(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAcessos() }, [])

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const email = novoEmail.trim().toLowerCase()
      const res = await fetch(`${url}/rest/v1/permissoes_usuarios`, {
        method: 'POST',
        headers: {...headers, Prefer: 'return=representation' },
        body: JSON.stringify({ email, role: novoPerfil })
      })
      if (!res.ok) throw new Error(await res.text())
      setShowCreate(false); setNovoEmail(''); loadAcessos()
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`${url}/rest/v1/permissoes_usuarios?id=eq.${editingUser.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role: novoPerfil })
      })
      if (!res.ok) throw new Error(await res.text())
      setShowEdit(false); setEditingUser(null); loadAcessos()
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleExcluir = async (id: string, email: string) => {
    if (!confirm(`Remover ${email}?`)) return
    await fetch(`${url}/rest/v1/permissoes_usuarios?id=eq.${id}`, { method: 'DELETE', headers: { apikey: key, Authorization: `Bearer ${key}` } })
    loadAcessos()
  }

  const openEdit = (user: any) => {
    setEditingUser(user)
    setNovoPerfil(user.role)
    setShowEdit(true)
  }

  const filtrados = useMemo(() => {
    if (!search) return acessos
    const s = search.toLowerCase()
    return acessos.filter((a: any) => `${a.email} ${a.role}`.toLowerCase().includes(s))
  }, [acessos, search])

  return (
    <div className="space-y-4">
      <div className="bg-[#0b1329] border border-[#1e293b] p-4 rounded-2xl flex justify-between">
        <div><h2 className="text-white font-bold">🛡️ Gestão de Acessos do Sistema</h2><p className="text-xs text-slate-400">Tabela: permissoes_usuarios - {currentUserEmail}</p></div>
        <button onClick={() => setShowCreate(true)} className="bg-[#d4a017] hover:bg-yellow-400 text-black font-black text-xs px-4 py-2 rounded-xl flex gap-2 items-center"><Plus className="w-4 h-4" /> Criar Usuário</button>
      </div>

      <div className="bg-[#0b1329] border border-[#1e293b] p-3 rounded-2xl">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por e-mail ou perfil..." className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" />
      </div>

      <div className="bg-[#0b1329] border border-[#1e293b] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-4 gap-4 p-4 text-[10px] uppercase text-slate-400 font-bold border-b border-white/5"><span>E-MAIL</span><span>PERFIL</span><span>CRIADO EM</span><span>AÇÕES</span></div>
        <div className="max-h-[600px] overflow-y-auto">
          {loading? <div className="p-10 text-center text-slate-400">Carregando...</div>
          : filtrados.map((a: any) => (
              <div key={a.id} className="grid grid-cols-4 gap-4 p-4 text-xs border-b border-white/5 hover:bg-white/5 text-slate-300">
                <span className="font-mono truncate">{a.email}</span>
                <span><span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">{a.role}</span></span>
                <span>{new Date(a.created_at).toLocaleString('pt-BR')}</span>
                <span className="flex gap-3">
                  <button onClick={() => openEdit(a)} className="text-yellow-400 hover:text-yellow-300 flex items-center gap-1"><Pencil className="w-3 h-3" /> Editar</button>
                  <button onClick={() => handleExcluir(a.id, a.email)} className="text-rose-400 hover:text-rose-300">Excluir</button>
                </span>
              </div>
            ))}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex justify-between p-5 border-b border-white/5"><h3 className="text-white font-bold">Criar Usuário</h3><button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={handleCriar} className="p-6 space-y-4">
              <input required type="email" placeholder="nome@senado.leg.br" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
              <select value={novoPerfil} onChange={e => setNovoPerfil(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                <option value="consulta">consulta</option><option value="editor">editor</option><option value="admin">admin</option><option value="super_admin">super_admin</option>
              </select>
              <button type="submit" disabled={saving} className="w-full bg-yellow-500 text-black font-black rounded-xl py-2.5">{saving? 'Criando...' : 'Criar'}</button>
            </form>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex justify-between p-5 border-b border-white/5"><h3 className="text-white font-bold flex gap-2 items-center"><Shield className="w-4 h-4 text-yellow-400" /> Editar Perfil</h3><button onClick={() => setShowEdit(false)}><X className="w-5 h-5 text-slate-400" /></button></div>
            <form onSubmit={handleEditar} className="p-6 space-y-4">
              <div><label className="text-[11px] uppercase text-slate-400 font-bold">E-mail</label><input disabled value={editingUser?.email} className="w-full mt-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-400" /></div>
              <div><label className="text-[11px] uppercase text-slate-400 font-bold">Novo Perfil</label>
                <select value={novoPerfil} onChange={e => setNovoPerfil(e.target.value)} className="w-full mt-1 bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                  <option value="consulta">consulta - só visualiza</option><option value="editor">editor - edita licenças</option><option value="admin">admin - gerencia tudo</option><option value="super_admin">super_admin - acesso total</option>
                </select>
              </div>
              <div className="flex gap-3"><button type="button" onClick={() => setShowEdit(false)} className="flex-1 bg-[#1e293b] text-white rounded-xl py-2.5 text-sm">Cancelar</button><button type="submit" disabled={saving} className="flex-1 bg-yellow-500 text-black font-black rounded-xl py-2.5 text-sm">{saving? 'Salvando...' : 'Salvar Perfil'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
