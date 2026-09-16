import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Search } from 'lucide-react';

// Total do Senado - fixo, quase nunca muda
const TOTAL: Record<string, { nome: string, total: number }> = {
  "EMSPREMIUM": { nome: "Enterprise Mobility + Security E3", total: 7029 },
  "EXCHANGEDESKLESS": { nome: "Exchange Online Kiosk", total: 1485 },
  "SPE_E3": { nome: "Microsoft 365 Apps para Grandes Empresas", total: 3938 },
  "Microsoft_365_Copilot": { nome: "Microsoft 365 Copilot", total: 300 },
  "SPE_F1": { nome: "Microsoft 365 F1", total: 2293 },
  "THREAT_INTELLIGENCE": { nome: "Microsoft Defender para Office 365 (Plano 1)", total: 8514 },
  "POWER_BI_PRO": { nome: "Microsoft Fabric (Gratuito)", total: 1100000 },
  "FLOW_FREE": { nome: "Microsoft Power Automate Gratuito", total: 10000 },
  "STANDARDPACK": { nome: "Office 365 E1", total: 7000 },
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
      if (!token) throw new Error('Faça login com Microsoft');

      // 1 chamada só - não puxa 5994 perfis, só o campo assignedLicenses
      const count = new Map<string, number>();
      let url: string | null = 'https://graph.microsoft.com/v1.0/users?$top=999&$select=assignedLicenses';

      while (url) {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) throw new Error(`Graph ${r.status}`);
        const j = await r.json();
        for (const u of j.value) {
          for (const lic of (u.assignedLicenses || [])) {
            count.set(lic.skuId, (count.get(lic.skuId) || 0) + 1);
          }
        }
        url = j['@odata.nextLink'] || null;
      }

      // Pega skuPartNumber pra traduzir skuId -> nome
      const partMap = new Map<string, string>();
      try {
        const sr = await fetch('https://graph.microsoft.com/v1.0/subscribedSkus?$select=skuId,skuPartNumber', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (sr.ok) {
          const sj = await sr.json();
          sj.value.forEach((s: any) => partMap.set(s.skuId, s.skuPartNumber));
        }
      } catch {}

      const final = Array.from(count.entries()).map(([skuId, atribuidas]) => {
        const part = partMap.get(skuId) || skuId;
        const base = TOTAL[part];
        if (!base) return null;
        return {
          skuId,
          nome: base.nome,
          total: base.total,
          atribuidas,
          disponiveis: base.total - atribuidas,
          percent: (atribuidas / base.total) * 100
        };
      }).filter(Boolean) as any[];

      setSkus(final.sort((a,b) => b.atribuidas - a.atribuidas));
      setLastSync(new Date().toLocaleTimeString('pt-BR'));
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 300000); // atualiza sozinho a cada 5 min
    return () => clearInterval(i);
  }, []);

  const filtered = useMemo(() => skus.filter(s => s.nome.toLowerCase().includes(filtro.toLowerCase())), [skus, filtro]);

  return (
    <div className="space-y-4 bg-[#020C1A] min-h-screen -m-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Licenças</h1>
          <p className="text-[11px] text-zinc-500">Total fixo • Atribuídas atualiza automático • Sync: {lastSync || 'carregando...'}</p>
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
          <div className="col-span-5">Nome ↑</div>
          <div className="col-span-2">Disponíveis</div>
          <div className="col-span-5">Atribuídas</div>
        </div>
        {filtered.map((s: any) => (
          <div key={s.skuId} className="grid grid-cols-12 gap-4 p-3 items-center border-b border-white/5 hover:bg-white/[0.03] text-sm">
            <div className="col-span-5 flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0a1930] border border-white/10 flex items-center justify-center text-[#D4AF37] text-[10px]">◍</div>
              <span className="text-white truncate">{s.nome}</span>
            </div>
            <div className="col-span-2 text-white font-bold">{s.disponiveis.toLocaleString('pt-BR')}</div>
            <div className="col-span-5 flex items-center gap-3">
              <div className="flex-1 h-2 bg-black/50 rounded-full max-w-[220px] overflow-hidden">
                <div className="h-2 bg-[#7c3aed] rounded-full" style={{ width: `${Math.min(s.percent, 100)}%`}} />
              </div>
              <span className="text-zinc-400 text-xs">{s.atribuidas}/{s.total}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default MicrosoftApps;
