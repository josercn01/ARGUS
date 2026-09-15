import { useState, useEffect, useMemo } from 'react'

export function AccessManagement({ currentRole, currentUserEmail }: any) {
  const [acessos, setAcessos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadAcessos = async () => {
    setLoading(true)
    try {
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = { apikey: key, Authorization: `Bearer ${key}` }

      console.log('[Acessos] Buscando tabela correta: permissoes_usuarios')

      // NOME CORRETO QUE APARECE NA SUA ABA DO SUPABASE
      const res = await fetch(`${url}/rest/v1/permissoes_usuarios?select=*&order=created_at.desc&limit=1000`, { headers })

      if (!res.ok) {
        const txt = await res.text()
        console.error('[Acessos] Erro na tabela permissoes_usuarios:', res.status, txt)
        throw new Error(txt)
      }

      const data = await res.json()
      console.log('[Acessos] ✅ SUCESSO! Tabela permissoes_usuarios:', data.length, 'registros', data[0])
      setAcessos(data)

    } catch (err: any) {
      console.error('[Acessos] Erro:', err.message)
      setAcessos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAcessos() }, [])

  const filtrados = useMemo(() => {
    if (!search) return acessos
    const s = search.toLowerCase()
    return acessos.filter((a: any) =>
      `${a.email || a.login || ''} ${a.perfil || a.role || a.perfil_acesso || ''}`.toLowerCase().includes(s)
    )
  }, [acessos, search])

  return (
    <div className="space-y-4">
      <div className="bg-[#0b1329] border border-[#1e293b] p-4 rounded-2xl">
        <h2 className="text-white font-bold">🛡️ Gestão de Acessos do Sistema</h2>
        <p className="text-xs text-slate-400 mt-1">Gerenciamento de funções e permissões dos usuários do Argus Coaten. Tabela: permissoes_usuarios</p>
        <div className="mt-4 relative">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por e-mail ou perfil..." className="w-full bg-[#020C1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white pl-10" />
          <span className="absolute left-3 top-3 text-slate-500 text-xs">🔍</span>
        </div>
      </div>

      <div className="bg-[#0b1329] border border-[#1e293b] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-4 gap-4 p-4 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-white/5">
          <span>E-MAIL</span>
          <span>PERFIL</span>
          <span>CRIADO EM</span>
          <span>ATUALIZADO EM</span>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {loading? <div className="p-10 text-center text-slate-400 text-sm">Carregando...</div>
          : filtrados.length === 0? <div className="p-10 text-center text-slate-400 text-sm">Nenhum registro em permissoes_usuarios</div>
          : filtrados.map((a: any, i: number) => (
              <div key={a.id || i} className="grid grid-cols-4 gap-4 p-4 text-xs border-b border-white/5 hover:bg-white/5 text-slate-300">
                <span className="truncate font-mono">{a.email || a.login || a.e_mail}</span>
                <span><span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">{a.perfil || a.perfil_acesso || a.role || 'consulta'}</span></span>
                <span>{a.created_at? new Date(a.created_at).toLocaleString('pt-BR') : '-'}</span>
                <span>{a.updated_at? new Date(a.updated_at).toLocaleString('pt-BR') : '-'}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="text-[10px] text-slate-500 p-2">
        Logado como: {currentUserEmail} ({currentRole}) - Total: {filtrados.length} registros da tabela permissoes_usuarios
      </div>
    </div>
  )
}
