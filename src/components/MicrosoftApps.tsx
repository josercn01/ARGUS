import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Cloud, RefreshCw, Search, Users, Plus, Minus, Download } from 'lucide-react';

const FRIENDLY_NAMES: Record<string, string> = {
  "EMSPREMIUM": "Enterprise Mobility + Security E3",
  "EXCHANGEDESKLESS": "Exchange Online Kiosk",
  "SPE_E3": "Microsoft 365 Apps para Grandes Empresas",
  "Microsoft_365_Copilot": "Microsoft 365 Copilot",
  "SPE_F1": "Microsoft 365 F1",
  "THREAT_INTELLIGENCE": "Microsoft Defender para Office 365 (Plano 1)",
  "POWER_BI_PRO": "Microsoft Fabric (Gratuito)",
  "FLOW_FREE": "Microsoft Power Automate Gratuito",
  "STANDARDPACK": "Office 365 E1",
  "SPE_E3_FED": "Office 365 E3",
  "POWERAPPS_VIRAL": "Avaliação de Viral do Microsoft Copilot Studio",
  "STREAM": "Avaliação do Microsoft Stream",
  "POWERAPPS_PER_USER": "Avaliação do Plano 2 do Microsoft Power Apps"
};

export function MicrosoftApps() {
  const [loading, setLoading] = useState(false);
  const [skus, setSkus] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedSku, setSelectedSku] = useState<any>(null);
  const [filtro, setFiltro] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (m: string) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${m}`,...p].slice(0, 20));

  const sync = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;
      if (!token) throw new Error('Token vazio - faça logout e login com Microsoft');

      // 1. SKUs
      const sRes = await fetch('https://graph.microsoft.com/v1.0/subscribedSkus', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!sRes.ok) throw new Error(`subscribedSkus ${sRes.status}`);
      const sJson = await sRes.json();
      const mapped = sJson.value.map((s: any) => ({
       ...s,
        nome: FRIENDLY_NAMES[s.skuPartNumber] || s.skuPartNumber,
        disponiveis: (s.prepaidUnits?.enabled || 0) - (s.consumedUnits || 0),
        atribuidas: s.consumedUnits || 0,
        total: s.prepaidUnits?.enabled || 0,
        percent: s.prepaidUnits?.enabled? (s.consumedUnits / s.prepaidUnits.enabled * 100) : 0
      })).sort((a: any, b: any) => b.atribuidas - a.atribuidas);
      setSkus(mapped);
      addLog(`✅ ${mapped.length} licenças carregadas`);

      // 2. Users
      let allUsers: any[] = [];
      let url: string | null = 'https://graph.microsoft.com/v1.0/users?$top=999&$select=id,displayName,mail,userPrincipalName';
      while (url) {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json();
        allUsers = allUsers.concat(j.value);
        url = j['@odata.nextLink'] || null;
        if (allUsers.length > 2000) break;
      }
      setUsers(allUsers);
      addLog(`✅ ${allUsers.length} usuários`);

    } catch (e: any) {
      addLog(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const gerenciarLicenca = async (userId: string, skuId: string, adicionar: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;
      if (!token) return;

      addLog(`${adicionar? 'Atribuindo' : 'Removendo'} licença...`);

      const body = {
        addLicenses: adicionar? [{ skuId, disabledPlans: [] }] : [],
        removeLicenses: adicionar? [] : [skuId]
      };

      const res = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}/assignLicense`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Graph ${res.status}: ${txt}`);
      }
      addLog(`✅ ${adicionar? 'Licença atribuída' : 'Licença removida'} com sucesso`);
      sync(); // recarrega
    } catch (e: any) {
      addLog(`❌ Erro ao gerenciar: ${e.message}`);
      alert(`Erro: ${e.message}\n\nPrecisa de permissão de Administrador de Licenças no Entra ID`);
    }
  };

  const filteredSkus = useMemo(() => {
    if (!filtro) return skus;
    return skus.filter((s: any) => s.nome.toLowerCase().includes(filtro.toLowerCase()) || s.skuPartNumber.toLowerCase().includes(filtro.toLowerCase()));
  }, [skus, filtro]);

  return (
    <div className="space-y-4 bg-[#020C1A] min-h-screen -m-8 p-8">
      {/* HEADER IGUAL PRINT MICROSOFT */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Licenças</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const csv = "Nome,SKU,Disponiveis,Atribuidas,Total\n" + skus.map((s: any) => `${s.nome},${s.skuPartNumber},${s.disponiveis},${s.atribuidas},${s.total}`).join("\n");
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'licencas.csv'; a.click();
          }} className="text-xs text-cyan-400 flex items-center gap-1 hover:underline">
            <Download className="w-4 h-4" /> Exportar para CSV
          </button>
          <button onClick={sync} disabled={loading} className="bg-[#D4AF37] text-black px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`} /> {loading? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <span className="text-zinc-400">Filtros:</span>
        <span className="bg-[#1e293b] text-cyan-300 px-3 py-1 rounded-full">Tipo de conta: Organização, Autoatendimento</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-zinc-500">{filteredSkus.length} itens</span>
          <div className="flex items-center gap-2 bg-[#00121E] border border-white/10 rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-zinc-500" />
            <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Pesquisar" className="bg-transparent outline-none text-white w-48 text-xs" />
          </div>
        </div>
      </div>

      {/* TABELA IGUAL SUA PRINT */}
      <div className="bg-[#061a32] border border-white/10 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-3 text-[11px] text-zinc-400 uppercase tracking-widest border-b border-white/10">
          <div className="col-span-5">Nome ↑</div>
          <div className="col-span-2">Licenças disponí...</div>
          <div className="col-span-5">Licenças atribuídas</div>
        </div>

        {filteredSkus.map((sku: any) => (
          <div key={sku.skuId} onClick={()=>setSelectedSku(sku)} className="grid grid-cols-12 gap-4 p-3 items-center border-b border-white/5 hover:bg-white/[0.03] cursor-pointer text-sm">
            <div className="col-span-5 flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0a1930] border border-white/10 flex items-center justify-center text-[#D4AF37] text-[10px]">◍</div>
              <span className="text-white truncate">{sku.nome}</span>
            </div>
            <div className="col-span-2 text-zinc-300">{sku.disponiveis}</div>
            <div className="col-span-5 flex items-center gap-3">
              <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden max-w-[200px]">
                <div className="h-2 bg-[#7c3aed] rounded-full" style={{ width: `${sku.percent}%`}} />
              </div>
              <span className="text-zinc-400 text-xs">{sku.atribuidas}/{sku.total}</span>
            </div>
          </div>
        ))}

        {skus.length === 0 &&!loading && (
          <div className="p-10 text-center text-zinc-500 text-sm">
            <Cloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Clique em Atualizar para carregar licenças do Microsoft 365
          </div>
        )}
      </div>

      {/* MODAL GERENCIAR */}
      {selectedSku && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#00121E] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-white">{selectedSku.nome}</h2>
                <p className="text-xs text-zinc-400">{selectedSku.skuPartNumber} - {selectedSku.atribuidas}/{selectedSku.total} em uso</p>
              </div>
              <button onClick={()=>setSelectedSku(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="p-4">
              <p className="text-xs text-zinc-400 mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Clique para atribuir/remover licença deste usuário. Precisa ser Admin de Licenças.</p>
              <div className="max-h-[400px] overflow-auto space-y-1">
                {users.slice(0, 100).map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-2.5 bg-black/30 rounded-lg border border-white/5">
                    <div className="overflow-hidden">
                      <p className="text-white text-sm truncate">{u.displayName}</p>
                      <p className="text-zinc-500 text-[11px] truncate">{u.mail || u.userPrincipalName}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={()=>gerenciarLicenca(u.id, selectedSku.skuId, true)} className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 px-3 py-1 rounded-lg text-xs flex items-center gap-1"><Plus className="w-3 h-3" /> Atribuir</button>
                      <button onClick={()=>gerenciarLicenca(u.id, selectedSku.skuId, false)} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-1 rounded-lg text-xs flex items-center gap-1"><Minus className="w-3 h-3" /> Remover</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-black/50 border border-white/10 rounded-lg p-3 font-mono text-[10px] text-zinc-500">
        {logs.map((l,i) => <div key={i}>{l}</div>)}
        {logs.length===0 && <div>Aguardando sincronização...</div>}
      </div>
    </div>
  );
}
export default MicrosoftApps;
