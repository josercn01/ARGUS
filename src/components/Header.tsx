import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Cloud, RefreshCw } from 'lucide-react';

export function MicrosoftApps() {
  const [logs, setLogs] = useState<string[]>(['Aguardando teste...']);
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<any>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`,...prev]);
  };

  const testar = async () => {
    setLoading(true);
    setLogs([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;

      if (!token) {
        addLog('❌ Provider Token vazio. Faça logout e login novamente com Microsoft.');
        throw new Error('Token vazio');
      }

      addLog(`✅ Token OK: ${token.substring(0, 20)}...`);
      addLog('Chamando Edge Function sync-m365...');

      const { data, error } = await supabase.functions.invoke('sync-m365', {
        body: { providerToken: token }
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Erro na Edge');

      addLog(`✅ Sucesso! ${data.totalUsuarios} usuários encontrados`);
      setDados(data);

    } catch (e: any) {
      addLog(`❌ ERRO: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Cloud className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Aplicativos Microsoft</h1>
            <p className="text-xs text-zinc-400">Admin Center M365 API - Licenças e Usuários</p>
          </div>
        </div>
        <button
          onClick={testar}
          disabled={loading}
          className="bg-[#D4AF37] hover:bg-[#c19b2e] text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading? 'animate-spin' : ''}`} />
          {loading? 'Testando...' : 'Testar Conexão'}
        </button>
      </div>

      {dados?.licencasContagem && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dados.licencasContagem.map((lic: any) => (
            <div key={lic.skuId} className="bg-[#00121E] border border-[#1e293b] p-4 rounded-xl">
              <p className="text-zinc-400 text-xs uppercase tracking-widest">{lic.nome}</p>
              <p className="text-2xl font-bold text-white mt-1">{lic.total} usuários</p>
              <p className="text-[10px] text-zinc-500 truncate mt-1">{lic.skuId}</p>
            </div>
          ))}
        </div>
      )}

      {dados?.users && (
        <div className="bg-[#00121E] border border-[#1e293b] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#1e293b] font-bold text-white flex justify-between">
            <span>Usuários ({dados.totalUsuarios})</span>
            <span className="text-xs font-normal text-zinc-400">Licenciados: {dados.totalLicenciados}</span>
          </div>
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#000d17] text-zinc-400 text-xs uppercase">
                <tr><th className="p-3">Nome</th><th className="p-3">Email</th><th className="p-3">Licenças</th></tr>
              </thead>
              <tbody>
                {dados.users.map((u: any) => (
                  <tr key={u.id} className="border-t border-[#1e293b] hover:bg-white/5">
                    <td className="p-3 text-white">{u.displayName}</td>
                    <td className="p-3 text-zinc-400">{u.mail || u.userPrincipalName}</td>
                    <td className="p-3 text-cyan-300 text-xs">{u.licencasNomes?.map((l: any) => l.nome).join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-black border border-[#1e293b] rounded-xl p-4 font-mono text-xs h-48 overflow-auto">
        {logs.map((l, i) => <div key={i} className="text-zinc-300 py-0.5">{l}</div>)}
      </div>
    </div>
  );
}

export default MicrosoftApps;
