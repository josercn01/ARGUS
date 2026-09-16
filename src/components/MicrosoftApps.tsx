import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Search } from 'lucide-react';

const TOTAL: Record<string, { nome: string, total: number }> = {
  "EMSPREMIUM": { nome: "Enterprise Mobility + Security E3", total: 7029 },
  "EXCHANGEDESKLESS": { nome: "Exchange Online Kiosk", total: 1485 },
  "SPE_E3": { nome: "Microsoft 365 Apps para Grandes Empresas", total: 3938 },
  "Microsoft_365_Copilot": { nome: "Microsoft 365 Copilot", total: 300 },
  "SPE_F1": { nome: "Microsoft 365 F1", total: 2293 },
  "THREAT_INTELLIGENCE": { nome: "Microsoft Defender para Office 365 (Plano 1)", total: 8514 },
  "FLOW_FREE": { nome: "Microsoft Power Automate Gratuito", total: 10000 },
  "STANDARDPACK": { nome: "Office 365 E1", total: 7000 },
  "SPE_E3_FED": { nome: "Office 365 E3", total: 29 },
};

const PART_TO_TOTAL: Record<string, string> = {
  "EMSPREMIUM": "EMSPREMIUM", "EXCHANGEDESKLESS": "EXCHANGEDESKLESS",
  "SPE_E3": "SPE_E3", "STANDARDPACK": "STANDARDPACK",
  "M365_F1_COMM": "SPE_F1", "SPE_F1": "SPE_F1",
  "THREAT_INTELLIGENCE": "THREAT_INTELLIGENCE"
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

      const countPart = new Map<string, number>();
      const countSkuId = new Map<string, number>();
      let url: string | null = 'https://graph.microsoft.com/beta/users?$top=999&$select=id&$expand=licenseDetails';
      let totalUsers = 0;
      let comLicenca = 0;

      while (url) {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) {
          const txt = await r.text();
          throw new Error(`Graph ${r.status}: ${txt.substring(0,200)}`);
        }
        const j = await r.json();
        totalUsers += j.value.length;

        for (const u of j.value) {
          const details = u.licenseDetails || [];
          if (details.length > 0) comLicenca++;
          for (const lic of details) {
            // lic tem skuPartNumber e skuId
            const part = lic.skuPartNumber || lic.skuId;
            const skuId = lic.skuId;
            countPart.set(part, (countPart.get(part) || 0) + 1);
            countSkuId.set(skuId, (countSkuId.get(skuId) || 0) + 1);
          }
        }
        url = j['@odata.nextLink'] || null;
        if (totalUsers > 10000) break;
      }

      console.log('Parts encontrados:', Object.fromEntries(countPart));
      console.log('SkuIds encontrados:', Object.fromEntries(countSkuId));
      console.log(`Total users: ${totalUsers}, com licença: ${comLicenca}`);

      const final = Array.from(countPart.entries()).map(([part, atribuidas]) => {
        const key = PART_TO_TOTAL[part] || part;
        const base = TOTAL[key] || TOTAL[part];
        const nome = base?.nome || part;
        const total = base?.total || atribuidas;
        return {
          part,
          nome,
          total,
          atribuidas,
          disponiveis: base? (base.total - atribuidas) : 0,
          percent: base? (atribuidas / base.total * 100) : 100
        };
      });

      setSkus(final.sort((a,b) => b.atribuidas - a.atribuidas));
      setLastSync(`${new Date().toLocaleTimeString('pt-BR')} - ${totalUsers} varridos, ${comLicenca} com licença`);
    } catch (e: any) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => skus.filter(s => s.nome.toLowerCase().includes(filtro.toLowerCase())), [skus][filtro]);

  return (
    <div className="space-y-4 bg-[#020C1A] min-h-screen -m-8 p-8">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Licenças</h1><p className="text-[11px] text-zinc-500">Total fixo • Atribuídas via grupo • {lastSync}</p></div>
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
          <div key={s.part} className="grid grid-cols-12 gap-4 p-3 items-center border-b border-white/5 text-sm">
            <div className="col-span-5 flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-[#0a1930] border border-white/10 flex items-center justify-center text-[#D4AF37] text-[10px]">◍</div><span className="text-white truncate">{s.nome}</span></div>
            <div className="col-span-2 text-white font-bold">{s.disponiveis.toLocaleString('pt-BR')}</div>
            <div className="col-span-5 flex items-center gap-3">
              <div className="flex-1 h-2 bg-black/50 rounded-full max-w-[220px] overflow-hidden"><div className="h-2 bg-[#7c3aed] rounded-full" style={{ width: `${Math.min(s.percent, 100)}%`}} /></div>
              <span className="text-zinc-400 text-xs">{s.atribuidas}/{s.total}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
export default MicrosoftApps;
