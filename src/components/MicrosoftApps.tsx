import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Search, Cloud } from 'lucide-react';

const SKU_MAP: Record<string, { nome: string, part: string }> = {
  "18181a46-0d4e-45cd-891e-60aabd171b4e": { nome: "Microsoft 365 Apps para Grandes Empresas", part: "SPE_E3" },
  "05e9a617-0261-4cee-bb44-138d3ef38b31": { nome: "Enterprise Mobility + Security E3", part: "EMSPREMIUM" },
  "3dd8bd5a-b545-4ea6-aeb4-3397bebdec22": { nome: "Microsoft 365 Apps F3", part: "SPE_F1" },
  "90d8b3f8-712a-4f7b-b1be-c0d37c7a2b45": { nome: "Microsoft 365 F1 - Comercial", part: "M365_F1_COMM" },
  "c42b9cae-ea4f-4ab7-9717-81576235c986": { nome: "Microsoft 365 F3", part: "SPE_F1" },
  "efb87545-963c-4e0d-99df-69c6916db086": { nome: "Exchange Online Kiosk", part: "EXCHANGEDESKLESS" },
  "6634e0f5-1a9b-4abc-928d-cd94c5e26a8d": { nome: "Microsoft 365 F1", part: "M365_F1" },
};

export function MicrosoftApps() {
  const [loading, setLoading] = useState(false);
  const [skus, setSkus] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [totalUsers, setTotalUsers] = useState(0);

  const sync = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;
      if (!token) throw new Error('Token vazio');

      // Pega assignedLicenses direto na lista de usuários - 1 chamada, sem loop de licenseDetails
      const count = new Map<string, number>();
      let url: string | null = 'https://graph.microsoft.com/v1.0/users?$top=999&$select=id,displayName,assignedLicenses';
      let total = 0;

      while (url) {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) throw new Error(`${r.status}`);
        const j = await r.json();
        total += j.value.length;

        for (const u of j.value) {
          for (const lic of (u.assignedLicenses || [])) {
            count.set(lic.skuId, (count.get(lic.skuId) || 0) + 1);
          }
        }
        url = j['@odata.nextLink'] || null;
        if (total > 5000) break;
      }

      setTotalUsers(total);
      const mapped = Array.from(count.entries()).map(([skuId, atribuidas]) => {
        const known = SKU_MAP[skuId];
        return {
          skuId,
          nome: known?.nome || skuId,
          skuPartNumber: known?.part || skuId.substring(0, 8),
          atribuidas,
          total: atribuidas,
          disponiveis: '-',
        };
      });

      setSkus(mapped.sort((a,b)=>b.atribuidas - a.atribuidas));

    } catch (e: any) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => skus.filter(s => s.nome.toLowerCase().includes(filtro.toLowerCase())), [skus, filtro]);

  return (
    <div className="space-y-4 bg-[#020C1A] min-h-screen -m-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Licenças</h1>
          <p className="text-xs text-zinc-500">{totalUsers} usuários varridos - {skus.length} tipos encontrados</p>
        </div>
        <button onClick={sync} disabled={loading} className="bg-[#D4AF37] text-black px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} /> Atualizar
        </button>
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
          <div key={sku.skuId} className="grid grid-cols-12 gap-4 p-3 items-center border-b border-white/5 hover:bg-white/[0.03] text-sm">
            <div className="col-span-6 flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0a1930] border border-white/10 flex items-center justify-center text-[#D4AF37] text-[10px]">◍</div>
              <div>
                <p className="text-white truncate">{sku.nome}</p>
                <p className="text-[10px] text-zinc-500">{sku.skuId}</p>
              </div>
            </div>
            <div className="col-span-2 text-zinc-500">{sku.disponiveis}</div>
            <div className="col-span-4 flex items-center gap-3">
              <div className="flex-1 h-2 bg-black/50 rounded-full max-w-[200px]"><div className="h-2 bg-[#7c3aed] rounded-full" style={{width: '85%'}} /></div>
              <span className="text-zinc-300 text-xs font-bold">{sku.atribuidas}</span>
            </div>
          </div>
        ))}
        {filtered.length===0 &&!loading && <div className="p-10 text-center text-zinc-500 text-sm"><Cloud className="w-8 h-8 mx-auto mb-2" />Clique em Atualizar - agora vai trazer tudo sem dar 403</div>}
      </div>
    </div>
  );
}
export default MicrosoftApps;
