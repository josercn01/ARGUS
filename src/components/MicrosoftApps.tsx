import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Search } from 'lucide-react';

type Lic = {
  skuId: string;
  skuPartNumber: string;
  displayName: string;
  total: number;
  consumidas: number;
  disponiveis: number;
}

export function MicrosoftApps() {
  const [licencas, setLicencas] = useState<Lic[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [erro, setErro] = useState('');

  const load = async () => {
    setLoading(true);
    setErro('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;
      if (!token) throw new Error('Faça login com Microsoft');

      // UMA chamada só - traz tudo
      const r = await fetch('https://graph.microsoft.com/v1.0/subscribedSkus', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!r.ok) {
        const txt = await r.text();
        if (r.status === 403) {
          throw new Error('403 - Seu App não tem permissão Organization.Read.All ou Directory.Read.All. Peça para o admin liberar no Entra ID > App Registrations > API permissions');
        }
        throw new Error(`Graph ${r.status}: ${txt}`);
      }

      const j = await r.json();

      const lista: Lic[] = j.value
       .filter((s: any) => s.prepaidUnits?.enabled > 0)
       .map((s: any) => ({
          skuId: s.skuId,
          skuPartNumber: s.skuPartNumber,
          displayName: s.skuPartNumber, // ou use um mapa se quiser nome bonito
          total: s.prepaidUnits.enabled,
          consumidas: s.consumedUnits,
          disponiveis: s.prepaidUnits.enabled - s.consumedUnits
        }))
       .sort((a: any,b: any) => b.total - a.total);

      setLicencas(lista);

    } catch (e: any) {
      console.error(e);
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    licencas.filter(l => l.skuPartNumber.toLowerCase().includes(filtro.toLowerCase())),
    [licencas][filtro]
  );

  return (
    <div className="space-y-4 bg-[#020C1A] min-h-screen -m-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Licenças</h1>
          <p className="text-[11px] text-zinc-500">Total do produto • Disponíveis • Sem varredura de usuários</p>
          {erro && <p className="text-red-400 text-xs mt-1">{erro}</p>}
        </div>
        <button onClick={load} disabled={loading} className="bg-[#D4AF37] text-black px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} /> Atualizar
        </button>
      </div>

      <div className="flex items-center gap-2 bg-[#00121E] border border-white/10 rounded-lg px-3 py-2 w-fit">
        <Search className="w-4 h-4 text-zinc-500" />
        <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Pesquisar SKU" className="bg-transparent outline-none text-white w-72 text-xs" />
        <span className="text-zinc-500 text-xs ml-3">{filtered.length} produtos</span>
      </div>

      <div className="bg-[#061a32] border border-white/10 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-3 text-[11px] text-zinc-400 uppercase border-b border-white/10">
          <div className="col-span-6">NOME / SKU</div>
          <div className="col-span-2">TOTAL</div>
          <div className="col-span-2">DISPONÍVEIS</div>
          <div className="col-span-2">ATRIBUÍDAS</div>
        </div>

        {filtered.map((s) => (
          <div key={s.skuId} className="grid grid-cols-12 gap-4 p-3 items-center border-b border-white/5 text-sm hover:bg-white/[0.03]">
            <div className="col-span-6 text-white truncate" title={s.skuId}>{s.skuPartNumber}</div>
            <div className="col-span-2 text-white font-bold">{s.total}</div>
            <div className="col-span-2 text-emerald-400 font-bold">{s.disponiveis}</div>
            <div className="col-span-2 text-zinc-400">{s.consumidas}</div>
          </div>
        ))}

        {filtered.length === 0 &&!loading &&!erro && (
          <div className="p-10 text-center text-zinc-500 text-sm">Nenhum produto encontrado</div>
        )}
      </div>
    </div>
  );
}
export default MicrosoftApps;
