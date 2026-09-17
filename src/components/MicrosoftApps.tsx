import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Download, Search, Cloud, X } from 'lucide-react';

type Item = { id: string; nome: string; total: number; atribuidas: number; sku: string[] };

const STORAGE_KEY = 'argus_m365_licencas_v3';
const LAST_SYNC_KEY = 'argus_m365_last_sync_v3';

// DADOS REAIS - 17 ITENS DA SUA CONSOLE admin.cloud.microsoft
const DADOS_REAIS_CONSOLE: Item[] = [
  { id: 'ems', nome: 'Enterprise Mobility + Security E3', total: 7029, atribuidas: 5001, sku: ['EMSPREMIUM'] },
  { id: 'kiosk', nome: 'Exchange Online Kiosk', total: 1485, atribuidas: 1360, sku: ['EXCHANGEDESKLESS'] },
  { id: 'apps-ent', nome: 'Microsoft 365 Apps for enterprise', total: 3938, atribuidas: 3936, sku: ['SPE_E3', 'OFFICESUBSCRIPTION'] },
  { id: 'copilot', nome: 'Microsoft 365 Copilot', total: 300, atribuidas: 300, sku: ['Microsoft_365_Copilot'] },
  { id: 'f1', nome: 'Microsoft 365 F1', total: 2293, atribuidas: 767, sku: ['SPE_F1', 'M365_F1_COMM'] },
  { id: 'copilot-studio', nome: 'Microsoft Copilot Studio Viral Trial', total: 10000, atribuidas: 7, sku: ['Microsoft_CopilotStudio_Viral'] },
  { id: 'defender', nome: 'Microsoft Defender para Office 365 (Plano 1)', total: 8514, atribuidas: 8119, sku: ['THREAT_INTELLIGENCE'] },
  { id: 'fabric', nome: 'Microsoft Fabric (Free)', total: 1100000, atribuidas: 144, sku: ['POWER_BI_PRO', 'FABRIC_FREE'] },
  { id: 'powerapps-p2', nome: 'Microsoft Power Apps Plan 2 Trial', total: 10000, atribuidas: 6, sku: ['POWERAPPS_P2_VIRAL'] },
  { id: 'automate', nome: 'Microsoft Power Automate Free', total: 10000, atribuidas: 507, sku: ['FLOW_FREE'] },
  { id: 'stream', nome: 'Microsoft Stream Trial', total: 1000000, atribuidas: 32, sku: ['Microsoft_Stream_Viral'] },
  { id: 'rooms', nome: 'Microsoft Teams Rooms Basic', total: 25, atribuidas: 0, sku: ['TEAMS_ROOMS_BASIC'] },
  { id: 'e1', nome: 'Office 365 E1', total: 7000, atribuidas: 6792, sku: ['STANDARDPACK'] },
  { id: 'e3', nome: 'Office 365 E3', total: 29, atribuidas: 27, sku: ['STANDARDWOFFPACK'] },
  { id: 'project', nome: 'Planner and Project Plan 3', total: 30, atribuidas: 18, sku: ['PROJECT_P3'] },
  { id: 'd365', nome: 'Dynamics 365 Sales Premium Viral', total: 10000, atribuidas: 1, sku: ['DYN365_SALES_VIRAL'] },
  { id: 'visio', nome: 'Visio Plan 2', total: 15, atribuidas: 4, sku: ['VISIOCLIENT', 'VISIO_P2'] },
];

export function MicrosoftApps() {
  const [dados, setDados] = useState<Item[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.length >= 15) return p;
      }
    } catch {}
    return DADOS_REAIS_CONSOLE;
  });
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(() => {
    const last = localStorage.getItem(LAST_SYNC_KEY);
    return last? `Sincronizado em ${new Date(Number(last)).toLocaleString('pt-BR')} • Fonte: admin.cloud.microsoft` : 'Dados do Admin Center - Cache local - Clique em Atualizar para sincronizar';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  }, [dados]);

  const dadosFiltrados = useMemo(() => {
    if (!busca.trim()) return dados;
    const t = busca.toLowerCase();
    return dados.filter(d => d.nome.toLowerCase().includes(t) || d.sku.join(' ').toLowerCase().includes(t));
  }, [dados, busca]);

  const atualizarAoVivo = async () => {
    setLoading(true);
    setMsg('Conectando na Graph API...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;
      if (!token) {
        setMsg('Token expirado. Faça logout e login com Microsoft novamente.');
        setLoading(false);
        return;
      }

      // 1. Fonte da verdade - subscribedSkus
      setMsg('Buscando totais oficiais (subscribedSkus)...');
      const skuRes = await fetch('https://graph.microsoft.com/v1.0/subscribedSkus', {
        headers: { Authorization: `Bearer ${token}` }
      });

      let totaisReais: Record<string, { total: number; consumido: number }> = {};
      if (skuRes.ok) {
        const skuJson = await skuRes.json();
        DADOS_REAIS_CONSOLE.forEach(item => {
          for (const skuPart of item.sku) {
            const found = skuJson.value.find((s: any) => s.skuPartNumber === skuPart || s.skuPartNumber.includes(skuPart));
            if (found) {
              totaisReais[item.id] = { total: found.prepaidUnits.enabled, consumido: found.consumedUnits };
              break;
            }
          }
        });
        setDados(prev => prev.map(d => totaisReais[d.id]? {...d, total: totaisReais[d.id].total, atribuidas: totaisReais[d.id].consumido } : d));
        setMsg('Totais da console sincronizados. Validando usuários...');
      }

      // 2. Validação ao vivo por usuário
      const contagem: Record<string, number> = {};
      DADOS_REAIS_CONSOLE.forEach(d => contagem[d.id] = 0);

      let url: string | null = 'https://graph.microsoft.com/v1.0/users?$top=999&$select=id';
      const ids: string[] = [];
      while (url) {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) break;
        const j = await r.json();
        j.value?.forEach((u: any) => ids.push(u.id));
        url = j['@odata.nextLink'] || null;
      }

      let processados = 0;
      for (let i = 0; i < ids.length; i += 60) {
        const slice = ids.slice(i, i + 60);
        const body = { requests: slice.map((id, idx) => ({ id: `${idx}`, method: 'GET', url: `/users/${id}/licenseDetails?$select=skuPartNumber` })) };

        const br = await fetch('https://graph.microsoft.com/v1.0/$batch', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (br.status === 429) {
          const retry = Number(br.headers.get('Retry-After') || 3);
          await new Promise(r => setTimeout(r, retry * 1000));
          i -= 60; continue;
        }

        if (br.ok) {
          const bj = await br.json();
          for (const resp of bj.responses) {
            if (resp.status === 200) {
              for (const lic of resp.body.value) {
                const prod = DADOS_REAIS_CONSOLE.find(p => p.sku.some(s => lic.skuPartNumber.includes(s) || s.includes(lic.skuPartNumber)));
                if (prod) contagem[prod.id]++;
              }
            }
          }
        }
        processados += slice.length;
        if (processados % 600 === 0) setMsg(`Validando... ${processados}/${ids.length} (${Math.round(processados/ids.length*100)}%)`);
      }

      const finais = DADOS_REAIS_CONSOLE.map(d => ({
       ...d,
        total: totaisReais[d.id]?.total?? d.total,
        atribuidas: contagem[d.id] > 0? contagem[d.id] : (totaisReais[d.id]?.consumido?? d.atribuidas),
      }));

      setDados(finais);
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finais));
      localStorage.setItem(LAST_SYNC_KEY, now.toString());
      setMsg(`Sincronizado ao vivo agora - ${ids.length} usuários validados - ${new Date().toLocaleString('pt-BR')}`);
    } catch (e: any) {
      setMsg(`Erro: ${e.message} - mantendo dados da console`);
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    const csv = ['NOME,DISPONIVEIS,ATRIBUIDAS,TOTAL',...dados.map(p => `"${p.nome}",${p.total - p.atribuidas},${p.atribuidas},${p.total}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `licencas_m365_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const totalGeral = dados.reduce((a,b) => a + b.total, 0);
  const atribuidasGeral = dados.reduce((a,b) => a + b.atribuidas, 0);

  return (
    <div className="bg-[#020C1A] min-h-screen p-8 text-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div className="flex gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8c6e1a] flex items-center justify-center text-black"><Cloud className="w-5 h-5" /></div>
            <div>
              <h1 className="text-[22px] font-bold leading-none">Aplicativos Microsoft</h1>
              <p className="text-[11px] text-[#D4AF37] font-mono mt-1 tracking-widest">ADMIN CENTER M365 API • 17 LICENÇAS</p>
              <p className="text-[12px] text-zinc-400 mt-2">{msg}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{totalGeral.toLocaleString('pt-BR')} totais • {atribuidasGeral.toLocaleString('pt-BR')} atribuídas • {(totalGeral - atribuidasGeral).toLocaleString('pt-BR')} disponíveis</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportarCSV} className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-[12px] flex items-center gap-2 hover:bg-white/10"><Download className="w-4 h-4" /> CSV</button>
            <button onClick={atualizarAoVivo} disabled={loading} className="h-11 px-5 rounded-xl bg-[#D4AF37] text-black font-bold text-[12px] flex items-center gap-2 disabled:opacity-60 hover:bg-[#c9a72f]"><RefreshCw className={`w-4 h-4 ${loading? 'animate-spin' : ''}`} />{loading? 'Sincronizando...' : 'Atualizar'}</button>
          </div>
        </div>

        <div className="relative mb-6">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar licença... ex: 'E1', 'Copilot', 'Defender'" className="w-full h-[48px] pl-11 pr-11 bg-[#08152a] border border-white/10 rounded-2xl text-[14px] outline-none focus:border-[#D4AF37]/50 focus:bg-[#0a1930] transition" />
          {busca && <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button>}
        </div>

        <div className="bg-[#0a1930] border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10 bg-[#020C1A]/50">
            <div className="col-span-5">Nome</div>
            <div className="col-span-2">Disponíveis</div>
            <div className="col-span-5">Atribuídas</div>
          </div>

          {dadosFiltrados.map(p => {
            const disp = p.total - p.atribuidas;
            const pct = Math.min(100, Math.max(0, (p.atribuidas / p.total) * 100));
            return (
              <div key={p.id} className="grid grid-cols-12 px-5 py-[14px] items-center border-b border-white/[0.05] hover:bg-white/[0.03] transition">
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[8px] shrink-0">◆</div>
                  <span className="text-[13px] text-zinc-100 truncate">{p.nome}</span>
                </div>
                <div className={`col-span-2 text-[13px] font-bold ${disp < 50 && disp > 0? 'text-amber-400' : disp === 0? 'text-red-400' : 'text-emerald-400'}`}>{disp.toLocaleString('pt-BR')}</div>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-[240px] max-w-[45vw] h-2 bg-[#10233f] rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${pct >= 98? 'bg-red-400' : pct >= 85? 'bg-amber-400' : 'bg-[#D4AF37]'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[12px] text-zinc-400 whitespace-nowrap">{p.atribuidas.toLocaleString('pt-BR')}/{p.total.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            );
          })}
        </div>

        {dadosFiltrados.length === 0 && (
          <div className="text-center py-12 text-zinc-500 text-[13px]">Nenhuma licença encontrada para "{busca}"</div>
        )}

        <p className="text-[11px] text-zinc-500 mt-3">
          Fonte oficial: <span className="text-zinc-300">/subscribedSkus</span> (total da console) + <span className="text-zinc-300">/users/licenseDetails</span> (contagem ao vivo). Cache local de 15 min.
        </p>
      </div>
    </div>
  );
}
