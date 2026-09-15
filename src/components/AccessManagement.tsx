import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Shield } from 'lucide-react'

export function AccessManagement({ currentRole, currentUserEmail }: any) {
  const [acessos, setAcessos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [novoEmail, setNovoEmail] = useState('')
  const [novoPerfil, setNovoPerfil] = useState('consulta')
  const [saving, setSaving] = useState(false)

  const loadAcessos = async () => {
    setLoading(true)
    try {
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = { apikey: key, Authorization: `Bearer ${key}` }
      const res = await fetch(`${url}/rest/v1/permissoes_usuarios?select=*&order=created_at.desc&limit=1000`, { headers })
      const data = await res.json()
      console.log('[Acessos] Tabela permissoes_usuarios:', data.length)
      setAcessos(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAcessos() }, [])

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = novoEmail.trim().toLowerCase()

    if (!email.endsWith('@senado.leg.br')) {
      alert('Use apenas e-mail institucional @senado.leg.br')
      return
    }
    if (!email.includes('@')) { alert('E-mail inválido'); return }

    setSaving(true)
    try {
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY

      // 1. Cria o acesso na tabela permissoes_usuarios
      const res = await fetch(`${url}/rest/v1/permissoes_usuarios`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          email: email,
          role: novoPerfil, // sua coluna no print é 'role'
          perfil: novoPerfil, // salva nas duas por garantia
          created_at: new Date().toISOString()
        })
      })

      if (!res.ok) {
        const txt = await res.text()
        if (txt.includes('duplicate') || txt.includes('already exists')) {
          alert('Este e-mail já tem acesso cadastrado!')
        } else {
          throw new Error(txt)
        }
        return
      }

      // 2. Cria o usuário no Auth do Supabase com senha provisória (precisa trocar no primeiro acesso)
      // Isso permite que ele entre com as credenciais do Senado (e-mail + senha)
      const senhaProvisoria = `Senado@${new Date().getFullYear()}!`
      const { error: authError } = await supabase.auth.signUp({
        email: email,
        password: senhaProvisoria,
        options: { data: { role: novoPerfil } }
      })

      // Se o usuário já existe no Auth, não é erro
      if (authError &&!authError.message.includes('already registered')) {
        console.warn('Aviso Auth:', authError.message)
      }

      alert(`✅ Acesso criado com sucesso!\n\nE-mail: ${email}\nPerfil: ${novoPerfil}\nSenha provisória: ${senhaProvisoria}\n\nO usuário deve entrar em https://argus-6oq2.onrender.com e trocar a senha.`)

      setShowModal(false)
      setNovoEmail('')
      setNovoPerfil('consulta')
      loadAcessos()

    } catch (err: any) {
      alert(`Erro ao criar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleExcluir = async (id: string, email: string) => {
    if (!confirm(`Remover acesso de ${email}?`)) return
    try {
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY
      await fetch(`${url}/rest/v1/permissoes_usuarios?id=eq.${id}`, {
        method: 'DELETE',
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      })
      loadAcessos()
    } catch (err: any) { alert(err.message) }
  }

  const filtrados = useMemo(() => {
    if (!search) return acessos
    const s = search.toLowerCase()
    return acessos.filter((a: any) => `${a.email || ''} ${a.role || ''}`.toLowerCase().includes(s))
  }, [acessos, search])

  return (
    <div className="space-y-4">
      <div className="bg-[#0b1329] border border-[#1e293b] p-4 rounded-2xl flex justify-between items-start">
        <div>
          <h2 className="text-white font-bold flex items-center gap-2">🛡️ Gestão de Acessos do Sistema</h2>
          <p className="text-xs text-slate-400 mt-1">Tabela: permissoes_usuarios - Logado como {currentUserEmail}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2">
          <Plus className="w-4 h-4" /> Criar Usuário
        </button>
      </div>

      <div className="bg-[#0b1329] border border-[#1e293b] p-3 rounded-2xl">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por e-mail ou perfil..." className="w-full bg-[#020C1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white" />
      </div>

      <div className="bg-[#0b1329] border border-[#1e293b] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-5 gap-4 p-4 text-[10px] uppercase text-slate-400 font-bold border-b border-white/5">
          <span className="col-span-2">E-MAIL</span><span>PERFIL</span><span>CRIADO EM</span><span>AÇÕES</span>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {loading? <div className="p-10 text-center text-slate-400">Carregando...</div>
          : filtrados.map((a: any) => (
              <div key={a.id} className="grid grid-cols-5 gap-4 p-4 text-xs border-b border-white/5 hover:bg-white/5 text-slate-300">
                <span className="col-span-2 font-mono truncate">{a.email}</span>
                <span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${a.role === 'super_admin'? 'bg-red-500/10 text-red-400 border-red-500/20' : a.role === 'admin'? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>{a.role || a.perfil}</span></span>
                <span>{a.created_at? new Date(a.created_at).toLocaleString('pt-BR') : '-'}</span>
                <span><button onClick={() => handleExcluir(a.id, a.email)} className="text-rose-400 hover:text-rose-300 text-[10px]">Excluir</button></span>
              </div>
            ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-[#1e293b] rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-white/5">
              <h3 className="text-white font-bold flex items-center gap-2"><Shield className="w-4 h-4 text-yellow-400" /> Conceder Acesso - Senado</h3>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCriarUsuario} className="p-6 space-y-4">
              <div>
                <label className="text-[11px] uppercase text-slate-400 font-bold">E-mail Institucional</label>
                <input required type="email" placeholder="nome@senado.leg.br" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} className="w-full mt-1 bg-[#020C1A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
                <p className="text-[10px] text-slate-500 mt-1">Apenas @senado.leg.br será aceito</p>
              </div>
              <div>
                <label className="text-[11px] uppercase text-slate-400 font-bold">Perfil de Acesso</label>
                <select value={novoPerfil} onChange={e => setNovoPerfil(e.target.value)} className="w-full mt-1 bg-[#020C1A] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">
                  <option value="consulta">Consulta - apenas visualiza</option>
                  <option value="admin">Admin - gerencia licenças e locais</option>
                  <option value="super_admin">Super Admin - acesso total</option>
                </select>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-[11px] text-blue-300">
                O usuário será criado no Supabase Auth com senha provisória <b>Senado@{new Date().getFullYear()}!</b> e deve trocar no primeiro login.
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-[#1e293b] text-white rounded-xl py-2.5 text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl py-2.5 text-sm">{saving? 'Criando...' : 'Criar Acesso'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
