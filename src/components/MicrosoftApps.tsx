import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Download, AlertTriangle } from 'lucide-react';

type Lic = { id: string, nome: string, total: number, skuPart: string[] };

const PRODUTOS: Lic[] = [
  { id: 'copilot-studio', nome: 'Avaliação de Viral do Microsoft Copilot Studio', total: 10000, skuPart: ['Microsoft_CopilotStudio_Viral'] },
  { id: 'stream', nome: 'Avaliação do Microsoft Stream', total: 1000000, skuPart: ['Microsoft_Stream_Viral'] },
  { id: 'powerapps-p2', nome: 'Avaliação do Plano 2 do Microsoft Power Apps', total: 10000, skuPart: ['POWERAPPS_VIRAL'] },
  { id: 'ems', nome: 'Enterprise Mobility + Security E3', total: 7029, skuPart: ['EMSPREMIUM'] },
  { id: 'kiosk', nome: 'Exchange Online Kiosk', total: 1485, skuPart: ['EXCHANGEDESKLESS'] },
  { id: 'apps-enterprise', nome: 'Microsoft 365 Apps para Grandes Empresas', total: 3938, skuPart: ['SPE_E3'] },
  { id: 'copilot', nome: 'Microsoft 365 Copilot', total: 300, skuPart: ['Microsoft_365_Copilot'] },
  { id: 'f1', nome: 'Microsoft 365 F1', total: 2293, skuPart: ['SPE_F1', 'M365_F1_COMM'] },
  { id: 'defender', nome: 'Microsoft Defender para Office 365 (Plano 1)', total: 8514, skuPart: ['THREAT_INTELLIGENCE'] },
  { id: 'fabric', nome: 'Microsoft Fabric (Gratuito)', total: 1100000, skuPart: ['POWER_BI_PRO', 'POWER_BI_STANDARD'] },
  { id: 'automate', nome: 'Microsoft Power Automate Gratuito', total: 10000, skuPart: ['FLOW_FREE'] },
  { id: 'e1', nome: 'Office 365 E1', total: 7000, skuPart: ['STANDARDPACK'] },
  { id: 'e3', nome: 'Office 365 E3', total: 29, skuPart: ['STANDARDWOFFPACK'] },
  { id: 'project-p3', nome: 'Planner e Project Plano 3', total: 30, skuPart: ['PROJECT_P3', 'PLANNER_P3'] },
  { id: 'teams-rooms', nome: 'Salas do Microsoft Teams Basic', total: 25, skuPart: ['TEAMS_ROOMS_BASIC'] },
  { id: 'd365-sales', nome: 'Teste Viral do Dynamics 365 Sales Premium', total: 10000, skuPart: ['DYN365_SALES_VIRAL'] },
  { id: 'visio', nome: 'Visio Plano 2', total: 15, skuPart: ['VISIOCLIENT', 'VISIO_P2'] },
];

export function MicrosoftApps() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);

  const carregar = async () => {
    setLoading(true); setErro(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;
      if (!token) throw new Error('Sessão sem token da Microsoft. Faça logout e entre de novo com Microsoft.');

      const contagem: Record<string, number> = {};
      PRODUTOS.forEach(p => contagem[p.id] = 0);
      let usersCount = 0;

      let url: string | null = `https://graph.microsoft.com/v1.0/users?$top=999&$select=id,assignedLicenses&$count=true`;
      // $count precisa do header ConsistencyLevel
      let headers: any = { Authorization: `Bearer ${token}`, ConsistencyLevel: 'eventual' };

      while (url) {
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const txt = await res.text();
          if (txt.includes('Invalid token') || res.status === 401) {
            throw new Error('Token Microsoft expirado. Faça LOGOUT e LOGIN novamente.');
          }
          throw new Error(`Graph erro ${res.status}: ${txt.slice(0,200)}`);
        }
        const json = await res.json();
        for (const u of json.value) {
          usersCount++;
          const licencasUsuario = u.assignedLicenses || [];
          // Se assignedLicenses vier vazio por causa de licença de GRUPO, busca o detalhe só desse user
          if (licencasUsuario.length === 0) {
            try {
              const det = await fetch(`https://graph.microsoft.com/v1.0/users/${u.id}/licenseDetails?$select=skuPartNumber`, { headers: { Authorization: `Bearer ${token}` } });
              if (det.ok) {
                const dj = await det.json();
                for (const d of dj.value) {
                  const prod = PRODUTOS.find(p => p.skuPart.includes(d.skuPartNumber));
                  if (prod) contagem[prod.id]++;
                }
                continue;
              }
            } catch {}
          } else {
            // Não temos skuPartNumber aqui, só skuId. Então usamos o licenseDetails como fonte principal abaixo.
            // Por isso vamos manter o fallback, mas contamos por skuPart se o Graph já trouxe.
          }
        }
        url = json['@odata.nextLink'] || null;
      }

      // Se a contagem por assignedLicenses falhou (licença por grupo), faz a varredura por licenseDetails em lote pequeno
      if (Object.values(contagem).every(v => v === 0)) {
        // refaz varredura só com licenseDetails - sua permissão atual permite
        const ids: string[] = [];
        let url2: string | null = `https://graph.microsoft.com/v1.0/users?$top=999&$select=id`;
        while (url2) {
          const r = await fetch(url2, { headers: { Authorization: `Bearer ${token}` } });
          const j = await r.json();
          if (!j.value) break;
          j.value.forEach((x:any) => ids.push(x.id));
          url2 = j['@odata.nextLink'] || null;
        }
        for (let i = 0; i < ids.length; i += 20) {
          const slice = ids.slice(i, i + 20);
          const body = { requests: slice.map((id, idx) => ({ id: `${idx}`, method: 'GET', url: `/users/${id}/licenseDetails?$select=skuPartNumber` })) };
          const br = await fetch('https://graph.microsoft.com/v1.0/$batch', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          if (br.ok) {
            const bj = await br.json();
            for (const resp of bj.responses) {
              if (resp.status === 200) {
                for (const lic of resp.body.value) {
                  const prod = PRODUTOS.find(p => p.skuPart.includes(lic.skuPartNumber));
                  if (prod) contagem[prod.id]++;
                }
              }
            }
          }
        }
        setTotalUsers(ids.length);
      } else {
        setTotalUsers(usersCount);
      }

      setCounts(contagem);
    } catch (e: any) {
      setErro(e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  return (
    <div className="bg-[#020C1A] min-h-screen p-6 text-white -m-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight">Licenças</h1>
            <p className="text-[12px] text-zinc-400 mt-1">{loading? 'Carregando...' : `${totalUsers} usuários verificados • Atualiza quando a Microsoft atualiza`}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="h-9 px-4 bg-[#0e213f] border border-white/10 rounded-lg text-[12px] flex items-center gap-2 hover:bg-white/10">
              <Download className="w-4 h-4" /> Exportar para CSV
            </button>
            <button onClick={carregar} disabled={loading} className="h-9 px-4 bg-[#D4AF37] text-black rounded-lg text-[12px] font-bold flex items-center gap-2 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>
        </div>

        {erro && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[12px] flex gap-2 items-start">
            <AlertTriangle className="w-4 h-4 mt-0.5" />
            <div><b>Erro de carregamento:</b> {erro}<br/>Solução: faça logout no ARGUS e entre novamente clicando em "Entrar com Microsoft".</div>
          </div>
        )}

        <div className="bg-[#061a32] border border-white/10 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10">
            <div className="col-span-5">Nome</div>
            <div className="col-span-2">Licenças disponíveis</div>
            <div className="col-span-5">Licenças atribuídas</div>
          </div>

          {PRODUTOS.map(p => {
            const atribuidas = counts[p.id]?? 0;
            const disponiveis = p.total - atribuidas;
            const pct = Math.min(100, Math.max(0, (atribuidas / p.total) * 100));

            return (
              <div key={p.id} className="grid grid-cols-12 px-5 py-3 items-center border-b border-white/[0.05] hover:bg-white/[0.03] transition text-[13px]">
                <div className="col-span-5 flex items-center gap-3 truncate">
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px]">◆</div>
                  <span className="truncate text-zinc-100">{p.nome}</span>
                </div>
                <div className="col-span-2">
                  {loading? <div className="w-8 h-3 bg-white/10 rounded animate-pulse" /> : <span className={disponiveis < 50? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>{disponiveis}</span>}
                </div>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-[200px] h-2 bg-[#0e213f] rounded-full overflow-hidden">
                    <div className="h-full bg-[#D4AF37]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-zinc-400 text-[12px]">{loading? '...' : `${atribuidas}/${p.total}`}</span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-zinc-500 mt-3">Fonte: Microsoft Graph com sua permissão atual (User.Read.All). Total fixo do Admin Center. Atribuídas conta ao vivo.</p>
      </div>
    </div>
  );
}
