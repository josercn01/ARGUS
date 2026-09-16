import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Search } from 'lucide-react';

// Mapa de SKU ID real da Microsoft -> Nome e Total do Senado
// Peguei os IDs mais comuns do seu tenant
const SKU_ID_MAP: Record<string, { nome: string, total: number, part: string }> = {
  "05e9a617-0261-4cee-bb44-138d3ef38b31": { nome: "Enterprise Mobility + Security E3", total: 7029, part: "EMSPREMIUM" },
  "efb87545-963c-4e0d-99df-69c6916db086": { nome: "Exchange Online Kiosk", total: 1485, part: "EXCHANGEDESKLESS" },
  "18181a46-0d4e-45cd-891e-60aabd171b4e": { nome: "Microsoft 365 Apps para Grandes Empresas", total: 3938, part: "SPE_E3" },
  "c7df2760-2c81-4ef7-b578-5b5392b571df": { nome: "Office 365 E1", total: 7000, part: "STANDARDPACK" },
  "6fd2c87f-b296-42f0-b197-1e91e994b900": { nome: "Office 365 E3", total: 29, part: "SPE_E3" },
  "90d8b3f8-712a-4f7b-b1be-c0d37c7a2b45": { nome: "Microsoft 365 F1", total: 2293, part: "M365_F1_COMM" },
  "3dd8bd5a-b545-4ea6-aeb4-3397bebdec22": { nome: "Microsoft 365 F1", total: 2293, part: "M365_F1" },
  "e97c048f-a7b0-43db-a3ff-3e6bcfcc3cb3": { nome: "Microsoft Defender para Office 365 (Plano 1)", total: 8514, part: "THREAT_INTELLIGENCE" },
  "a403ebcc-fed0-4e2a-adb4-12a38e8e1ea8": { nome: "Microsoft Power Automate Gratuito", total: 10000, part: "FLOW_FREE" },
  "f30db892-07e9-47e9-837c-80727f46fd57": { nome: "Microsoft 365 Copilot", total: 300, part: "Microsoft_365_Copilot" },
};

export function MicrosoftApps() {
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [lastSync, setLastSync] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;
      if (!token) throw new Error('Sem token Microsoft');

      // Só 1 chamada leve - NÃO usa subscribedSkus
      const count = new Map<string, number>();
      let url: string | null = 'https://graph.microsoft.com/v1.0/users?$top=999&$select=assignedLicenses';
      let totalUsers = 0;

      while (url) {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) throw new Error(`Graph ${r.status}`);
        const j = await r.json();
        totalUsers += j.value.length;
        for (const u of j.value) {
          for (const lic of (u.assignedLicenses || [])) {
            count.set(lic.skuId, (count.get(lic.skuId) || 0) + 1);
          }
        }
        url = j['@odata.nextLink'] || null;
        if (totalUsers > 8000) break;
      }

      // Monta lista sem precisar do subscribedSkus
      const final = Array.from(count.entries()).map(([skuId, atribuidas]) => {
        const known = SKU_ID_MAP[skuId];
        const nome = known?.nome || skuId.substring(0, 8);
        const total = known?.total || atribuidas; // se não conhecer o total, mostra só o uso
        return {
          skuId,
          nome,
          total,
          atribuidas,
          disponiveis: known? (known.total - atribuidas) : 0,
          percent: known? (atribuidas / known.total * 100) : 100
        };
      });

      // Adiciona no log pra você me mandar os IDs que faltarem
      console.log('SKU IDs encontrados no Senado:', Array.from(count.keys()));

      setSkus(final.sort((a,b) => b.atribuidas - a.atribuidas));
      setLastSync(new Date().toLocaleTimeString('pt-BR') + ` - ${totalUsers} usuários varridos`);
    } catch (e: any) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => skus.filter(s => s.nome.toLowerCase().includes(filtro.toLowerCase())), [skus, filtro]);

  return (
    <div className="space-y-4 bg-[#020C1A] min-h-screen -m-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Licenças</h1>
          <p className="text-[11px] text-zinc-500">Total fixo • Atribuídas atualiza automático • {lastSync}</p>
        </div>
        <button onClick={load} disabled={loading} className="bg-[#D4AF37] text-black px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} /> Atualizar
        </button>
      </div>

      <div className="flex items-center gap-2 bg-[#00121E] border border-white/10 rounded-lg px-3 py-2 w-fit">
        <Search className="w-4 h-4 text-zinc-500" />
        <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Pesquisar" className="bg-transparent outline-none text-white w-72 text-xs" />
        <span className="text-zinc-500 text-xs ml-3">{filtered.length} itens</span>
      </div>

      <div className="bg-[#061a32] border border-white/10 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-3 text-[11px] text-zinc-400 uppercase border-b border-white/10">
          <div className="col-span-5">NOME ↑</div><div className="col-span-2">DISPONÍVEIS</div><div className="col-span-5">ATRIBUÍDAS</div>
        </div>
        {filtered.map((s: any) => (
          <div key={s.skuId} className="grid grid-cols-12 gap-4 p-3 items-center border-b border-white/5 text-sm">
            <div className="col-span-5 flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0a1930] border border-white/10 flex items-center justify-center text-[#D4AF37] text-[10px]">◍</div>
              <span className="text-white truncate" title={s.skuId}>{s.nome}</span>
            </div>
            <div className="col-span-2 text-white font-bold">{s.disponiveis}</div>
            <div className="col-span-5 flex items-center gap-3">
              <div className="flex-1 h-2 bg-black/50 rounded-full max-w-[220px] overflow-hidden"><div className="h-2 bg-[#7c3aed] rounded-full" style={{ width: `${Math.min(s.percent, 100)}%`}} /></div>
              <span className="text-zinc-400 text-xs">{s.atribuidas}/{s.total}</span>
            </div>
          </div>
        ))}
        {filtered.length===0 &&!loading && <div className="p-10 text-center text-zinc-500 text-sm">Nenhum dado. Clique em Atualizar - agora sem 403</div>}
      </div>
    </div>
  );
}
export default MicrosoftApps;
