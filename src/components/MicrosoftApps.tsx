import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function MicrosoftApps() {
  const [logs, setLogs] = useState<string[]>(['Pronto para testar...'])
  const [loading, setLoading] = useState(false)
  const [dados, setDados] = useState<any>(null)

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`,...prev])

  const testar = async () => {
    setLoading(true)
    setLogs([])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.provider_token
      addLog(token? `Provider Token presente ✅ (${token.substring(0,20)}...)` : 'Provider Token vazio ❌ - faça logout/login')

      if (!token) throw new Error('Token vazio. Seu AuthContext ainda não está com offline_access')

      addLog('Chamando edge sync-m365...')
      const { data, error } = await supabase.functions.invoke('sync-m365', {
        body: { providerToken: token }
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error)

      addLog(`Sucesso! ${data.totalUsuarios} usuários, ${data.totalLicenciados} licenciados`)
      setDados(data)

    } catch (e: any) {
      addLog(`ERRO: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <button onClick={testar} disabled={loading} className="bg-[#D4AF37] text-black px-6 py-2 rounded font-bold disabled:opacity-50">
          {loading? 'Testando...' : 'Testar Conexão'}
        </button>
      </div>

      {/* Cards de Licenças */}
      {dados?.licencasContagem && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dados.licencasContagem.map((lic: any) => (
            <div key={lic.skuId} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
              <p className="text-zinc-400 text-sm">{lic.nome}</p>
              <p className="text-2xl font-bold text-white">{lic.total} usuários</p>
              <p className="text-xs text-zinc-500 truncate">{lic.skuId}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabela de Usuários */}
      {dados?.users && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 font-bold">Usuários ({dados.totalUsuarios})</div>
          <div className="overflow-auto max-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-800 text-zinc-400"><tr><th className="p-3">Nome</th><th className="p-3">Email</th><th className="p-3">Licenças</th></tr></thead>
              <tbody>
                {dados.users.map((u: any) => (
                  <tr key={u.id} className="border-t border-zinc-800">
                    <td className="p-3">{u.displayName}</td>
                    <td className="p-3 text-zinc-400">{u.mail || u.userPrincipalName}</td>
                    <td className="p-3">{u.licencasNomes?.map((l:any)=>l.nome).join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log de Debug */}
      <div className="bg-black border border-zinc-800 rounded-xl p-4 font-mono text-xs h-48 overflow-auto">
        {logs.map((l,i)=><div key={i} className="text-zinc-300">{l}</div>)}
      </div>
    </div>
  )
}
