import { useState, useEffect, useMemo } from 'react'

// CORREÇÃO: mesma lógica que arrumou o Dashboard e AdminLocais
export function AccessManagement({ currentRole, currentUserEmail }: any) {
  const [acessos, setAcessos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadAcessos = async () => {
    setLoading(true)
    try {
      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = {
        apikey: key,
        Authorization: `Bearer ${key}`
      }

      // TENTA descobrir qual é o nome da sua tabela de acessos
      // Seu projeto tem tabelas: usuarios, softwares, usuario_softwares, administradores_locais
      // A de acessos pode ser: acessos, usuarios_sistema, system_users, profiles, acessos_sistema
      const tabelasPossiveis = ['acessos', 'acessos_sistema', 'gestao_acessos', 'usuarios_sistema', 'system_users', 'profiles', 'usuarios_permitidos', 'allowed_users']

      let dadosEncontrados: any[] = []
      for (const tabela of tabelasPossiveis) {
        try {
          console.log(`[Acessos] Tentando tabela: ${tabela}`)
          const res = await fetch(`${url}/rest/v1/${tabela}?select=*&limit=1000`, { headers })
          if (res.ok) {
            const data = await res.json()
            if (data && data.length >= 0) {
              console.log(`[Acessos] ✅ Achou na tabela ${tabela}: ${data.length} registros`, data[0])
              dadosEncontrados = data
              break
            }
          }
        } catch (e) {}
      }

      // Se não achou em nenhuma, usa a tabela usuarios como fallback (ela tem email/perfil)
      if (dadosEncontrados.length === 0) {
        console.log('[Acessos] Nenhuma tabela de acesso encontrada, usando fallback usuarios')
        const res = await fetch(`${url}/rest/v1/usuarios?select=email,perfil,role,created_at,updated_at,login,setor&limit=1000`, { headers })
        if (res.ok) {
          const data = await res.json()
          dadosEncontrados = data.map((u: any) => ({
            email: u.email || u.login,
            perfil: u.perfil || u.role || u.setor || 'Usuário',
            criado_em: u.created_at,
            atualizado_em: u.updated_at
          }))
        }
      }

      setAcessos(dadosEncontrados)
    } catch (err: any) {
      console.error('[Acessos] Erro:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAcessos()
  }, [])

  const filtrados = useMemo(() => {
    if (!search) return acessos
    const s = search.toLowerCase()
    return acessos.filter((a: any) =>
      `${a.email || ''} ${a.perfil || a.role || ''}`.toLowerCase().includes(s)
    )
  }, [acessos, search])

  return (
    <div className="space-y-4">
      <div className="bg-[#0b1329] border border-[#1e293b] p-4 rounded-2xl">
        <h2 className="text-white font-bold flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs">🛡️</span>
          Gestão de Acessos do Sistema
        </h2>
        <p className="text-xs text-slate-400 mt-1">Gerenciamento de funções e permissões dos usuários do Argus Coaten.</p>

        <div className="mt-4 relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-[#020C1A] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white pl-10"
          />
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
          {loading? (
            <div className="p-10 text-center text-slate-400 text-sm">Carregando...</div>
          ) : filtrados.length === 0? (
            <div className="p-10 text-center text-slate-400 text-sm">Nenhum acesso encontrado. Verifique o Console (F12) qual tabela foi encontrada.</div>
          ) : (
            filtrados.map((a: any, i: number) => (
              <div key={i} className="grid grid-cols-4 gap-4 p-4 text-xs border-b border-white/5 hover:bg-white/5 text-slate-300">
                <span className="truncate">{a.email || a.e_mail || '-'}</span>
                <span><span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[10px]">{a.perfil || a.role || a.profile || 'USER'}</span></span>
                <span>{a.criado_em || a.created_at? new Date(a.criado_em || a.created_at).toLocaleDateString('pt-BR') : '-'}</span>
                <span>{a.atualizado_em || a.updated_at? new Date(a.atualizado_em || a.updated_at).toLocaleDateString('pt-BR') : '-'}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-[10px] text-slate-500 p-2">
        Logado como: {currentUserEmail} ({currentRole}) - Total: {filtrados.length} registros
      </div>
    </div>
  )
}
