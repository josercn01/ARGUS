import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Cloud, RefreshCw } from 'lucide-react';

export function MicrosoftApps() {
  const [logs, setLogs] = useState<string[]>(['Clique em Testar Conexão']);
  const [loading, setLoading] = useState(false);
  const [dados, setDados] = useState<any>(null);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`,...prev]);

  const testar = async () => {
    setLoading(true);
    setLogs([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;

      if (!token) {
        addLog('❌ Provider Token vazio. Faça LOGOUT e login com Microsoft de novo.');
        return;
      }
      addLog(`✅ Token presente: ${token.substring(0, 20)}...`);

      // CHAMA O GRAPH DIRETO, SEM EDGE FUNCTION
      addLog('Chamando graph.microsoft.com/v1.0/users...');
      const res = await fetch('https://graph.microsoft.com/v1.0/users?$top=50&$select=id,displayName,mail,userPrincipalName', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Graph erro ${res.status}: ${t}`);
      }
      const json = await res.json();
      addLog(`✅ SUCESSO! ${json.value.length} usuários lidos direto da Microsoft`);
      setDados({ users: json.value, totalUsuarios: json.value.length });

    } catch (e: any) {
      addLog(`❌ ERRO: ${e.message}`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center"><Cloud className="w-5 h-5 text-cyan-400" /></div>
          <div><h1 className="text-xl font-bold">Aplicativos Microsoft</h1><p className="text-xs text-zinc-400">Teste direto Graph API (sem Edge)</p></div>
        </div>
        <button onClick={testar} disabled={loading} className="bg-[#D4AF37] hover:bg-[#c19b2e] text-black px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading? 'animate-spin' : ''}`} />{loading? 'Testando...' : 'Testar Conexão'}
        </button>
      </div>

      {dados?.users && (
        <div className="bg-[#00121E] border border-[#1e293b] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#1e293b] font-bold">Usuários Microsoft ({dados.totalUsuarios})</div>
          <div className="max-h-[500px] overflow-auto">
            <table className="w-full text-sm"><thead className="bg-[#000d17] text-zinc-400 text-xs"><tr><th className="p-3 text-left">Nome</th><th className="p-3 text-left">Email</th></tr></thead>
              <tbody>{dados.users.map((u: any) => <tr key={u.id} className="border-t border-[#1e293b]"><td className="p-3 text-white">{u.displayName}</td><td className="p-3 text-zinc-400">{u.mail || u.userPrincipalName}</td></tr>)}</tbody>
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
