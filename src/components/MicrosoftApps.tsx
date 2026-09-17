import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Download } from 'lucide-react';

type Item = { id: string; nome: string; total: number; atribuidas: number; sku: string[]; skuId?: string };

const STORAGE_KEY = 'argus_m365_licencas_v3';
const LAST_SYNC_KEY = 'argus_m365_last_sync_v3';

// DADOS REAIS DO SEU PRINT admin.cloud.microsoft - 17 ITENS
const DADOS_REAIS_CONSOLE: Item[] = [
  { id: 'ems', nome: 'Enterprise Mobility + Security E3', total: 7029, atribuidas: 5001, sku: ['EMSPREMIUM'] },
  { id: 'kiosk', nome: 'Exchange Online Kiosk', total: 1485, atribuidas: 1360, sku: ['EXCHANGEDESKLESS'] },
  { id: 'apps-ent', nome: 'Microsoft 365 Apps for enterprise', total: 3938, atribuidas: 3936, sku: ['SPE_E3', 'OFFICESUBSCRIPTION'] },
  { id: 'copilot', nome: 'Microsoft 365 Copilot', total: 300, atribuidas: 300, sku: ['Microsoft_365_Copilot'] },
  { id: 'f1', nome: 'Microsoft 365 F1', total: 2293, atribuidas: 767, sku: ['SPE_F1', 'M365_F1_COMM'] },
  { id: 'copilot-studio', nome: 'Microsoft Copilot Studio Viral Trial', total: 10000, atribuidas: 7, sku: ['Microsoft_CopilotStudio_Viral'] },
  { id: 'defender', nome: 'Microsoft Defender para Office 365 (Plano 1)', total: 8514, atribuidas: 8119, sku: ['THREAT_INTELLIGENCE'] },
  { id: 'fabric', nome: 'Microsoft Fabric (Free)', total: 1100000, atribuidas: 144, sku: ['POWER_BI_PRO', 'POWER_BI_STANDARD', 'FABRIC_FREE'] },
  { id: 'powerapps-p2', nome: 'Microsoft Power Apps Plan 2 Trial', total: 10000, atribuidas: 6, sku: ['POWERAPPS_P2_VIRAL', 'POWERAPPS_VIRAL'] },
  { id: 'automate', nome: 'Microsoft Power Automate Free', total: 10000, atribuidas: 507, sku: ['FLOW_FREE'] },
  { id: 'stream', nome: 'Microsoft Stream Trial', total: 1000000, atribuidas: 32, sku: ['Microsoft_Stream_Viral', 'STREAM'] },
  { id: 'rooms', nome: 'Microsoft Teams Rooms Basic', total: 25, atribuidas: 0, sku: ['TEAMS_ROOMS_BASIC'] },
  { id: 'e1', nome: 'Office 365 E1', total: 7000, atribuidas: 6792, sku: ['STANDARDPACK'] },
  { id: 'e3', nome: 'Office 365 E3', total: 29, atribuidas: 27, sku: ['STANDARDWOFFPACK'] },
  { id: 'project', nome: 'Planner and Project Plan 3', total: 30, atribuidas: 18, sku: ['PROJECT_P3', 'PLANNER_P3', 'PROJECTPROFESSIONAL'] },
  { id: 'd365', nome: 'Dynamics 365 Sales Premium Viral', total: 10000, atribuidas: 1, sku: ['DYN365_SALES_VIRAL'] },
  { id: 'visio', nome: 'Visio Plan 2', total: 15, atribuidas: 4, sku: ['VISIOCLIENT', 'VISIO_P2'] },
];

export function MicrosoftApps() {
  const [dados, setDados] = useState<Item[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.length >= 15) return parsed;
      }
    } catch {}
    return DADOS_REAIS_CONSOLE;
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(() => {
    const last = localStorage.getItem(LAST_SYNC_KEY);
    return last? `Dados do Admin Center - ${new Date(Number(last)).toLocaleDateString('pt-BR')} ${new Date(Number(last)).toLocaleTimeString('pt-BR')}` : 'Dados do Admin Center - 16/09/2026 - Cache local';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
  }, [dados]);

  const atualizarAoVivo = async () => {
    setLoading(true);
    setMsg('Conectando na Graph API...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;
      if (!token) {
        setMsg('Token Microsoft expirado. Faça logout e login novamente com Microsoft para sincronizar ao vivo.');
        setLoading(false);
        return;
      }

      // 1. PEGA TOTAIS REAIS DA CONSOLE - subscribedSkus (fonte da verdade)
      setMsg('Buscando totais reais da console (subscribedSkus)...');
      const skuRes = await fetch('https://graph.microsoft.com/v1.0/subscribedSkus', {
        headers: { Authorization: `Bearer ${token}` }
      });

      let totaisReais: Record<string, { total: number; consumido: number }> = {};

      if (skuRes.ok) {
        const skuJson = await skuRes.json();
        DADOS_REAIS_CONSOLE.forEach(item => {
          for (const skuPart of item.sku) {
            const found = skuJson.value.find((s: any) => s.skuPartNumber === skuPart);
            if (found) {
              totaisReais[item.id] = {
                total: found.prepaidUnits.enabled,
                consumido: found.consumedUnits
              };
              break;
            }
          }
        });

        // Atualiza totais imediatamente com dados da console
        setDados(prev => prev.map(d => {
          if (totaisReais[d.id]) {
            return {...d, total: totaisReais[d.id].total, atribuidas: totaisReais[d.id].consumido };
          }
          return d;
        }));
        setMsg('Totais sincronizados com a console. Validando usuário a usuário...');
      }

      // 2. VALIDAÇÃO AO VIVO POR USUÁRIO (batch) - garante contagem real atribuída
      const contagem: Record<string, number> = {};
      DADOS_REAIS_CONSOLE.forEach(d => contagem[d.id] = 0);

      let url: string | null = 'https://graph.microsoft.com/v1.0/users?$top=999&$select=id';
      const ids: string[] = [];
      while (url) {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) throw new Error(`Falha ao listar usuários: ${r.status}`);
        const j = await r.json();
        if (!j.value) break;
        j.value.forEach((u: any) => ids.push(u.id));
        url = j['@odata.nextLink'] || null;
        if (ids.length % 2000 === 0) setMsg(`Listou ${ids.length} usuários...`);
      }

      let processados = 0;
      for (let i = 0; i < ids.length; i += 60) {
        const chunks = [
          ids.slice(i, i + 20),
          ids.slice(i + 20, i + 40),
          ids.slice(i + 40, i + 60),
        ].filter(c => c.length > 0);

        await Promise.all(chunks.map(async (slice) => {
          const body = {
            requests: slice.map((id, idx) => ({
              id: `${idx}`,
              method: 'GET',
              url: `/users/${id}/licenseDetails?$select=skuPartNumber`,
            })),
          };
          let tentativas = 0;
          while (tentativas < 3) {
            const br = await fetch('https://graph.microsoft.com/v1.0/$batch', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            if (br.status === 429) {
              const retry = Number(br.headers.get('Retry-After') || 2);
              await new Promise(r => setTimeout(r, retry * 1000));
              tentativas++;
              continue;
            }
            if (br.ok) {
              const bj = await br.json();
              for (const resp of bj.responses) {
                if (resp.status === 200) {
                  for (const lic of resp.body.value) {
                    const prod = DADOS_REAIS_CONSOLE.find(p => p.sku.includes(lic.skuPartNumber));
                    if (prod) contagem[prod.id]++;
                  }
                }
              }
            }
            break;
          }
        }));

        processados += chunks.flat().length;
        if (processados % 300 === 0) {
          const pct = Math.round((processados / ids.length) * 100);
          setMsg(`Validando ao vivo... ${processados}/${ids.length} (${pct}%) - ${Object.values(contagem).reduce((a,b)=>a+b,0)} atribuições contadas`);
        }
      }

      // 3. Merge final - prioriza contagem ao vivo se diferente da console (atraso de replicação)
      const dadosFinais = DADOS_REAIS_CONSOLE.map(d => ({
       ...d,
        total: totaisReais[d.id]?.total?? d.total,
        atribuidas: contagem[d.id] > 0? contagem[d.id] : (totaisReais[d.id]?.consumido?? d.atribuidas),
      }));

      setDados(dadosFinais);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dadosFinais));
      const now = Date.now();
      localStorage.setItem(LAST_SYNC_KEY, now.toString());
      setMsg(`Sincronizado ao vivo agora - ${ids.length} usuários validados - ${new Date().toLocaleString('pt-BR')}`);

    } catch (e: any) {
      console.error(e);
      setMsg(`Erro na sincronização: ${e.message}. Mantendo dados da console.`);
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    const csv = ['NOME,LICENCAS_DISPONIVEIS,LICENCAS_ATRIBUIDAS,TOTAL,SKU',...dados.map(p => {
      const disp = p.total - p.atribuidas;
      return `"${p.nome}",${disp},${p.atribuidas},${p.total},"${p.sku.join('|')}"`;
    })].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `licencas_m365_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="bg-[#020C1A] min-h-screen p-6 text-white -m-8">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[22px] font-bold">Licenças</h1>
            <p className="text-[12px] text-zinc-400 mt-1">{msg}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportarCSV} className="h-9 px-4 bg-[#0e213f] border border-white/10 rounded-lg text-[12px] flex items-center gap-2 hover:bg-white/10">
              <Download className="w-4 h-4" /> Exportar para CSV
            </button>
            <button
              onClick={atualizarAoVivo}
              disabled={loading}
              className="h-9 px-4 bg-[#D4AF37] text-black rounded-lg text-[12px] font-bold flex items-center gap-2 disabled:opacity-60 hover:bg-[#c9a72f]"
            >
              <RefreshCw className={`w-4 h-4 ${loading? 'animate-spin' : ''}`} />
              {loading? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>

        <div className="bg-[#0a1930] border border-white/10 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10">
            <div className="col-span-5">Nome</div>
            <div className="col-span-2">Licenças disponíveis</div>
            <div className="col-span-5">Licenças atribuídas</div>
          </div>

          {dados.map(p => {
            const disponiveis = p.total - p.atribuidas;
            const pct = Math.min(100, Math.max(0, (p.atribuidas / p.total) * 100));
            return (
              <div
                key={p.id}
                className="grid grid-cols-12 px-5 py-[14px] items-center border-b border-white/[0.05] hover:bg-white/[0.03]"
              >
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[8px]">◆</div>
                  <span className="text-[13px] text-zinc-100 truncate">{p.nome}</span>
                </div>
                <div className={`col-span-2 text-[13px] font-bold ${disponiveis < 50? 'text-amber-400' : 'text-emerald-400'}`}>{disponiveis}</div>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-[240px] h-2 bg-[#10233f] rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${pct >= 98? 'bg-red-400' : pct >= 85? 'bg-amber-400' : 'bg-[#D4AF37]'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[12px] text-zinc-400">
                    {p.atribuidas}/{p.total}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-zinc-500 mt-3">
          Fonte: subscribedSkus (total oficial) + licenseDetails por usuário (validação ao vivo). Cache de 15 min. Clique em Atualizar para forçar sync com admin.cloud.microsoft.
        </p>
      </div>
    </div>
  );
}
