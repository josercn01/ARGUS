import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Dados totais tirados do seu print do admin center
const PRODUTOS = [
  { id: 'CopilotStudioViral', nome: 'Avaliação de Viral do Microsoft Copilot Studio', total: 10000 },
  { id: 'StreamViral', nome: 'Avaliação do Microsoft Stream', total: 1000000 },
  { id: 'PowerAppsP2Viral', nome: 'Avaliação do Plano 2 do Microsoft Power Apps', total: 10000 },
  { id: 'EMSPREMIUM', nome: 'Enterprise Mobility + Security E3', total: 7029 },
  { id: 'EXCHANGEDESKLESS', nome: 'Exchange Online Kiosk', total: 1485 },
  { id: 'SPE_E3', nome: 'Microsoft 365 Apps para Grandes Empresas', total: 3938 },
  { id: 'Microsoft_365_Copilot', nome: 'Microsoft 365 Copilot', total: 300 },
  { id: 'SPE_F1', nome: 'Microsoft 365 F1', total: 2293 },
  { id: 'THREAT_INTELLIGENCE', nome: 'Microsoft Defender para Office 365 (Plano 1)', total: 8514 },
  { id: 'POWER_BI_PRO', nome: 'Microsoft Fabric (Gratuito)', total: 1100000 },
  { id: 'FLOW_FREE', nome: 'Microsoft Power Automate Gratuito', total: 10000 },
  { id: 'STANDARDPACK', nome: 'Office 365 E1', total: 7000 },
  { id: 'SPE_E3_FAC', nome: 'Office 365 E3', total: 29 },
  { id: 'PLANNER_P3', nome: 'Planner e Project Plano 3', total: 30 },
  { id: 'TEAMS_ROOMS_BASIC', nome: 'Salas do Microsoft Teams Basic', total: 25 },
  { id: 'DYN365_SALES_VIRAL', nome: 'Teste Viral do Dynamics 365 Sales Premium', total: 10000 },
  { id: 'VISIO_P2', nome: 'Visio Plano 2', total: 15 },
];

const MAP_PART: Record<string, string> = {
  "EMSPREMIUM": "EMSPREMIUM", "EXCHANGEDESKLESS": "EXCHANGEDESKLESS",
  "SPE_E3": "SPE_E3", "Microsoft_365_Copilot": "Microsoft_365_Copilot",
  "SPE_F1": "SPE_F1", "M365_F1_COMM": "SPE_F1",
  "THREAT_INTELLIGENCE": "THREAT_INTELLIGENCE",
  "FLOW_FREE": "FLOW_FREE", "STANDARDPACK": "STANDARDPACK"
};

export default function Licencas() {
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;
      if (!token) { setLoading(false); return; }

      const ids: string[] = [];
      let url: string | null = 'https://graph.microsoft.com/v1.0/users?$top=999&$select=id';
      while (url) {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json();
        j.value.forEach((u:any) => ids.push(u.id));
        url = j['@odata.nextLink'] || null;
      }

      const count = new Map<string, number>();
      for (let i = 0; i < ids.length; i += 20) {
        const slice = ids.slice(i, i+20);
        const body = { requests: slice.map((id, idx) => ({ id: `${idx}`, method: "GET", url: `/users/${id}/licenseDetails?$select=skuPartNumber` })) };
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
                const part = lic.skuPartNumber;
                const key = MAP_PART[part] || part;
                count.set(key, (count.get(key) || 0) + 1);
              }
            }
          }
        }
      }
      setContagem(Object.fromEntries(count));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="bg-white min-h-screen text-[#323130] font-sans">
      <div className="px-6 py-4">
        <h1 className="text-[20px] font-semibold">Licenças</h1>
        <div className="flex items-center gap-4 mt-3 text-[12px]">
          <button className="flex items-center gap-1 hover:underline"><span>↓</span> Exportar para CSV</button>
          <button onClick={() => window.location.reload()} className="flex items-center gap-1 hover:underline"><span>↻</span> Atualizar</button>
          <span className="ml-auto text-zinc-500">{PRODUTOS.length} itens</span>
        </div>

        <div className="mt-4 border-t">
          <div className="grid grid-cols-12 py-2 text-[12px] font-semibold border-b text-zinc-600">
            <div className="col-span-5">Nome ↑</div>
            <div className="col-span-2">Licenças disponí...</div>
            <div className="col-span-5">Licenças atribuídas</div>
          </div>

          {PRODUTOS.map(p => {
            const atribuidas = contagem[p.id] || 0;
            // Para os que você tem total fixo, usa a contagem real. Para os trials, mostra 0 se não contar
            const total = p.total;
            const disponiveis = total - atribuidas;
            const pct = total > 0? (atribuidas / total) * 100 : 0;

            return (
              <div key={p.id} className="grid grid-cols-12 py-[10px] items-center border-b border-zinc-100 hover:bg-zinc-50 text-[12px]">
                <div className="col-span-5 flex items-center gap-2 truncate">
                  <div className="w-5 h-5 rounded-full bg-[#f3f2f1] flex items-center justify-center text-[10px]">◇</div>
                  <span className="truncate">{p.nome}</span>
                </div>
                <div className="col-span-2">{loading? '...' : disponiveis}</div>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-[180px] h-[8px] bg-[#e1dfdd] rounded-[2px] overflow-hidden">
                    <div className="h-full bg-[#6264a7]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-zinc-600">{loading? '...' : `${atribuidas}/${total}`}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
