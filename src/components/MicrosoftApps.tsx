import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Search, Cloud, AlertTriangle } from 'lucide-react';

const FRIENDLY_NAMES: Record<string, string> = {
  "EMSPREMIUM": "Enterprise Mobility + Security E3",
  "EXCHANGEDESKLESS": "Exchange Online Kiosk",
  "SPE_E3": "Microsoft 365 Apps para Grandes Empresas",
  "Microsoft_365_Copilot": "Microsoft 365 Copilot",
  "SPE_F1": "Microsoft 365 F1",
  "THREAT_INTELLIGENCE": "Defender para Office 365 (Plano 1)",
  "STANDARDPACK": "Office 365 E1",
};

export function MicrosoftApps() {
  const [loading, setLoading] = useState(false);
  const [skus, setSkus] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (m: string) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${m}`,...p].slice(0, 15));

  const sync = async () => {
    setLoading(true);
    setSkus([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;
      if (!token) throw new Error('Token vazio');

      addLog('Contando licenças pelos usuários (sem precisar de admin)...');

      const countMap = new Map<string, number>();
      let url: string | null = 'https://graph.microsoft.com/v1.0/users?$top=999&$select=id,displayName';
      let total = 0;

      while (url) {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
        const j = await r.json();

        // pega licenças dos primeiros 200 pra não tomar throttle
        if (total < 200) {
          for (const u of j.value.slice(0, 30)) {
            const ld = await fetch(`https://graph.microsoft.com/v1.0/users/${u.id}/licenseDetails`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (ld.ok) {
              const lj = await ld.json();
              for (const lic of lj.value) {
                countMap.set(lic.skuPartNumber, (countMap.get(lic.skuPartNumber) || 0) + 1);
              }
            }
          }
        }
        total += j.value.length;
        url = j['@odata.nextLink'] || null;
        addLog(`... ${total} usuários varridos`);
        if (total > 1000) break;
      }

      const mapped = Array.from(countMap.entries()).map(([skuPartNumber, atribuidas]) => ({
        nome: FRIENDLY_NAMES[skuPartNumber] || skuPartNumber,
        skuPartNumber,
        disponiveis: 0,
        atribuidas,
        total: atribuidas,
      }));

      setSkus(mapped.sort((a,b)=>b.atribuidas - a.atribuidas));
      addLog(`✅ Pronto: ${mapped.length} tipos de licença encontrados`);

    } catch (e: any) {
      addLog(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => skus.filter(s => s.nome.toLowerCase().includes(filtro.toLowerCase())), [skus, filtro]);

  return (
    <div className="space-y-4 bg-[#020C1A] min-h-screen -m-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Licenças</h1>
        <button onClick={sync} disabled={loading} className="bg-[#D4AF37] text-black px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} /> {loading? 'Contando...' : 'Atualizar'}
        </button>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-3 text-xs text-amber-200">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-bold">Modo sem permissão de Admin</p>
          <p className="opacity-80">Você não tem permissão para editar o App. Esse modo conta as licenças lendo os usuários, por isso mostra só Atribuídas. Para ver Disponíveis e Gerenciar (Atribuir/Remover), precisa que a TI do Senado aprove - manda o texto abaixo pra eles.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-[#00121E] border border-white/10 rounded-lg px-3 py-1.5">
          <Search className="w-4 h-4 text-zinc-500" />
          <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Pesquisar" className="bg-transparent outline-none text-white w-64 text-xs" />
        </div>
        <span className="text-zinc-500 text-xs">{filtered.length} itens</span>
      </div>

      <div className="bg-[#061a32] border border-white/10 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-3 text-[11px] text-zinc-400 uppercase border-b border-white/10">
          <div className="col-span-6">Nome ↑</div>
          <div className="col-span-2">Disponí...</div>
          <div className="col-span-4">Atribuídas</div>
        </div>
        {filtered.map(sku => (
          <div key={sku.skuPartNumber} className="grid grid-cols-12 gap-4 p-3 items-center border-b border-white/5 text-sm">
            <div className="col-span-6 text-white">{sku.nome}</div>
            <div className="col-span-2 text-zinc-500">-</div>
            <div className="col-span-4 flex items-center gap-3">
              <div className="flex-1 h-2 bg-black/50 rounded-full max-w-[200px]"><div className="h-2 bg-[#7c3aed] rounded-full" style={{width: '70%'}} /></div>
              <span className="text-zinc-400 text-xs">{sku.atribuidas}</span>
            </div>
          </div>
        ))}
        {filtered.length===0 &&!loading && <div className="p-10 text-center text-zinc-500 text-sm"><Cloud className="w-8 h-8 mx-auto mb-2" />Clique em Atualizar</div>}
      </div>

      <div className="bg-[#00121E] border border-white/10 rounded-xl p-4 text-xs">
        <p className="font-bold text-white mb-2">Texto para mandar para TI do Senado:</p>
        <textarea readOnly className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-zinc-300 h-28 text-[11px]" value={`Olá, preciso de consentimento de administrador no Entra ID para o App 'Controle de Licenças' (ID: 9a9d5786-e1d4-4d2b-8fb9-9a31d3005a7)\n\nPermissões delegadas necessárias:\n- Organization.Read.All\n- User.Read.All \n- Directory.Read.All\n- User.ReadWrite.All (para gerenciar licenças)\n\nLink: https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/CallAnAPI/appId/9a9d5786-e1d4-4d2b-8fb9-9a31d3005a7/isMSAApp/~/false\n\nDepois clique em 'Conceder consentimento do administrador para Senado Federal'.`} />
      </div>

      <div className="bg-black/50 border border-white/10 rounded-lg p-3 font-mono text-[10px] text-zinc-500">
        {logs.map((l,i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
export default MicrosoftApps;
