import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Search, Plus, Minus, ArrowRightLeft } from 'lucide-react';

const BASELINE: Record<string, { nome: string, total: number }> = {
  "EMSPREMIUM": { nome: "Enterprise Mobility + Security E3", total: 7029 },
  "EXCHANGEDESKLESS": { nome: "Exchange Online Kiosk", total: 1485 },
  "SPE_E3": { nome: "Microsoft 365 Apps para Grandes Empresas", total: 3938 },
  "Microsoft_365_Copilot": { nome: "Microsoft 365 Copilot", total: 300 },
  "SPE_F1": { nome: "Microsoft 365 F1", total: 2293 },
  "THREAT_INTELLIGENCE": { nome: "Microsoft Defender para Office 365 (Plano 1)", total: 8514 },
  "POWER_BI_PRO": { nome: "Microsoft Fabric (Gratuito)", total: 1100000 },
  "FLOW_FREE": { nome: "Microsoft Power Automate Gratuito", total: 10000 },
  "STANDARDPACK": { nome: "Office 365 E1", total: 7000 },
  "SPE_E3_FED": { nome: "Office 365 E3", total: 29 },
};

export function MicrosoftApps() {
  const [skus, setSkus] = useState<any[]>([]);
  const [usersBySku, setUsersBySku] = useState<Record<string, any[]>>({});
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [buscaUser, setBuscaUser] = useState('');

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.provider_token;
  };

  const load = async () => {
    setLoading(true);
    const token = await getToken();
    if (!token) { setLoading(false); return; }

    // 1 chamada só pra contar e mapear quem tem o que
    const count = new Map<string, number>();
    const mapUsers = new Map<string, any[]>();
    const usersList: any[] = [];
    let url: string | null = 'https://graph.microsoft.com/v1.0/users?$top=999&$select=id,displayName,mail,assignedLicenses';

    while (url) {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      for (const u of j.value) {
        usersList.push(u);
        for (const lic of (u.assignedLicenses || [])) {
          count.set(lic.skuId, (count.get(lic.skuId) || 0) + 1);
          if (!mapUsers.has(lic.skuId)) mapUsers.set(lic.skuId, []);
          mapUsers.get(lic.skuId)!.push(u);
        }
      }
      url = j['@odata.nextLink'] || null;
      if (usersList.length > 5000) break;
    }

    // Tenta pegar partNumber pra nome bonito
    const partMap = new Map<string, string>();
    try {
      const sr = await fetch('https://graph.microsoft.com/v1.0/subscribedSkus?$select=skuId,skuPartNumber', { headers: { Authorization: `Bearer ${token}` } });
      if (sr.ok) {
        const sj = await sr.json();
        sj.value.forEach((s: any) => partMap.set(s.skuId, s.skuPartNumber));
      }
    } catch {}

    const final = Array.from(count.entries()).map(([skuId, atribuidas]) => {
      const part = partMap.get(skuId) || skuId;
      const base = BASELINE[part] || { nome: part, total: atribuidas };
      return { skuId, part, nome: base.nome, total: base.total, atribuidas, disponiveis: base.total - atribuidas, percent: base.total? (atribuidas / base.total * 100):0 };
    });

    setSkus(final.sort((a,b)=>b.atribuidas - a.atribuidas));
    setUsersBySku(Object.fromEntries(mapUsers));
    setAllUsers(usersList);
    setLoading(false);
  };

  const gerenciar = async (userId: string, skuId: string, adicionar: boolean) => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}/assignLicense`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addLicenses: adicionar? [{ skuId, disabledPlans: [] }] : [],
          removeLicenses: adicionar? [] : [skuId]
        })
      });
      if (!res.ok) {
        const txt = await res.text();
        if (txt.includes('403') || res.status === 403) throw new Error('403 - Sem permissão User.ReadWrite.All. Precisa de admin pra liberar gerenciamento.');
        throw new Error(txt);
      }
      alert(adicionar? 'Licença atribuída!' : 'Licença removida - ficou disponível pra outro');
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => skus.filter(s => s.nome.toLowerCase().includes(filtro.toLowerCase())), [skus, filtro]);
  const filteredUsers = useMemo(() => {
    if (!selected) return [];
    const list = usersBySku[selected.skuId] || [];
    if (!buscaUser) return list.slice(0, 100);
    return list.filter((u: any) => u.displayName.toLowerCase().includes(buscaUser.toLowerCase()) || u.mail?.toLowerCase().includes(buscaUser.toLowerCase())).slice(0, 100);
  }, [selected, buscaUser, usersBySku]);

  const usuariosSemLicenca = useMemo(() => {
    if (!selected) return [];
    if (!buscaUser) return [];
    return allUsers.filter((u: any) =>!(usersBySku[selected.skuId] || []).find((x: any) => x.id === u.id) && (u.displayName.toLowerCase().includes(buscaUser.toLowerCase()) || u.mail?.toLowerCase().includes(buscaUser.toLowerCase()))).slice(0, 20);
  }, [buscaUser, selected, allUsers, usersBySku]);

  return (
    <div className="space-y-4 bg-[#020C1A] min-h-screen -m-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Licenças <span className="text-xs font-normal text-zinc-500 ml-2">flutuantes - total fixo, atribuição dinâmica</span></h1>
        <button onClick={load} disabled={loading} className="bg-[#D4AF37] text-black px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} /> {loading? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <div className="flex items-center gap-2 bg-[#00121E] border border-white/10 rounded-lg px-3 py-2 w-fit">
        <Search className="w-4 h-4 text-zinc-500" />
        <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Pesquisar licença" className="bg-transparent outline-none text-white w-72 text-xs" />
      </div>

      <div className="bg-[#061a32] border border-white/10 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-3 text-[11px] text-zinc-400 uppercase border-b border-white/10">
          <div className="col-span-5">Nome ↑</div><div className="col-span-2">Disponí...</div><div className="col-span-5">Atribuídas</div>
        </div>
        {filtered.map((s: any) => (
          <div key={s.skuId} onClick={()=>setSelected(s)} className="grid grid-cols-12 gap-4 p-3 items-center border-b border-white/5 hover:bg-white/[0.05] cursor-pointer text-sm group">
            <div className="col-span-5 flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-[#0a1930] border border-white/10 flex items-center justify-center text-[#D4AF37]">◍</div><span className="text-white truncate">{s.nome}</span></div>
            <div className="col-span-2 text-white font-bold">{s.disponiveis}</div>
            <div className="col-span-5 flex items-center gap-3">
              <div className="flex-1 h-2 bg-black/50 rounded-full max-w-[220px]"><div className="h-2 bg-[#7c3aed] rounded-full" style={{width: `${Math.min(s.percent, 100)}%`}}/></div>
              <span className="text-zinc-400 text-xs">{s.atribuidas}/{s.total > 10000? `${(s.total/1000).toFixed(0)}k` : s.total}</span>
              <ArrowRightLeft className="w-4 h-4 text-zinc-600 group-hover:text-[#D4AF37]" />
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#00121E] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <div><h2 className="font-bold text-white">{selected.nome}</h2><p className="text-xs text-zinc-400">{selected.disponiveis} disponíveis de {selected.total} - {selected.atribuidas} em uso. Clique para tirar de um e liberar pra outro.</p></div>
              <button onClick={()=>setSelected(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="p-4 space-y-3 overflow-auto">
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-zinc-500" />
                <input value={buscaUser} onChange={e=>setBuscaUser(e.target.value)} placeholder="Buscar usuário que tem ou que precisa da licença..." className="bg-transparent outline-none text-white w-full text-sm" />
              </div>

              {usuariosSemLicenca.length > 0 && (
                <div>
                  <p className="text-xs text-cyan-400 mb-2 font-bold">Usuários sem essa licença (clique para atribuir):</p>
                  {usuariosSemLicenca.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between p-2.5 bg-cyan-950/30 rounded-lg border border-cyan-500/20 mb-1">
                      <div><p className="text-white text-sm">{u.displayName}</p><p className="text-zinc-500 text-[11px]">{u.mail}</p></div>
                      <button onClick={()=>gerenciar(u.id, selected.skuId, true)} className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-lg text-xs flex items-center gap-1"><Plus className="w-3 h-3" /> Atribuir</button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-zinc-400 font-bold mt-3">Quem está usando ({filteredUsers.length}):</p>
              {filteredUsers.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-2.5 bg-black/30 rounded-lg border border-white/5">
                  <div><p className="text-white text-sm">{u.displayName}</p><p className="text-zinc-500 text-[11px]">{u.mail}</p></div>
                  <button onClick={()=>gerenciar(u.id, selected.skuId, false)} className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-lg text-xs flex items-center gap-1"><Minus className="w-3 h-3" /> Remover (libera)</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default MicrosoftApps;
