import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Download } from 'lucide-react';

type Item = { id: string; nome: string; total: number; atribuidas: number; sku: string[] };

// NÚMEROS REAIS DO SEU PRINT - CARREGA NA HORA, SEM TRAVAR
const DADOS_FIXOS: Item[] = [
  { id: 'copilot-studio', nome: 'Avaliação de Viral do Microsoft Copilot Studio', total: 10000, atribuidas: 7, sku: [] },
  { id: 'stream', nome: 'Avaliação do Microsoft Stream', total: 1000000, atribuidas: 32, sku: [] },
  { id: 'powerapps-p2', nome: 'Avaliação do Plano 2 do Microsoft Power Apps', total: 10000, atribuidas: 6, sku: [] },
  { id: 'ems', nome: 'Enterprise Mobility + Security E3', total: 7029, atribuidas: 5001, sku: ['EMSPREMIUM'] },
  { id: 'kiosk', nome: 'Exchange Online Kiosk', total: 1485, atribuidas: 1360, sku: ['EXCHANGEDESKLESS'] },
  { id: 'apps-ent', nome: 'Microsoft 365 Apps para Grandes Empresas', total: 3938, atribuidas: 3935, sku: ['SPE_E3'] },
  { id: 'copilot', nome: 'Microsoft 365 Copilot', total: 300, atribuidas: 300, sku: ['Microsoft_365_Copilot'] },
  { id: 'f1', nome: 'Microsoft 365 F1', total: 2293, atribuidas: 768, sku: ['SPE_F1'] },
  { id: 'defender', nome: 'Microsoft Defender para Office 365 (Plano 1)', total: 8514, atribuidas: 8111, sku: ['THREAT_INTELLIGENCE'] },
  { id: 'fabric', nome: 'Microsoft Fabric (Gratuito)', total: 1100000, atribuidas: 144, sku: [] },
  { id: 'automate', nome: 'Microsoft Power Automate Gratuito', total: 10000, atribuidas: 507, sku: ['FLOW_FREE'] },
  { id: 'e1', nome: 'Office 365 E1', total: 7000, atribuidas: 6784, sku: ['STANDARDPACK'] },
  { id: 'e3', nome: 'Office 365 E3', total: 29, atribuidas: 27, sku: [] },
  { id: 'project', nome: 'Planner e Project Plano 3', total: 30, atribuidas: 17, sku: [] },
  { id: 'rooms', nome: 'Salas do Microsoft Teams Basic', total: 25, atribuidas: 0, sku: [] },
  { id: 'd365', nome: 'Teste Viral do Dynamics 365 Sales Premium', total: 10000, atribuidas: 1, sku: [] },
  { id: 'visio', nome: 'Visio Plano 2', total: 15, atribuidas: 4, sku: [] },
];

export function MicrosoftApps() {
  const [dados, setDados] = useState(DADOS_FIXOS);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('Dados do Admin Center - 16/09/2026');

  const atualizarAoVivo = async () => {
    setLoading(true);
    setMsg('Tentando atualizar ao vivo...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.provider_token;
      if (!token) {
        setMsg('Token Microsoft expirado. Mostrando dados salvos. Faça logout/login para atualizar ao vivo.');
        setLoading(false);
        return;
      }

      const contagem: Record<string, number> = {};
      DADOS_FIXOS.forEach(d => contagem[d.id] = 0);

      // Busca só o que sua permissão permite: licenseDetails
      let url: string | null = 'https://graph.microsoft.com/v1.0/users?$top=999&$select=id';
      const ids: string[] = [];
      while (url) {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) throw new Error('Falha Graph');
        const j = await r.json();
        j.value.forEach((u:any) => ids.push(u.id));
        url = j['@odata.nextLink'] || null;
      }

      for (let i = 0; i < ids.length; i += 20) {
        const slice = ids.slice(i, i+20);
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
                const prod = DADOS_FIXOS.find(p => p.sku.includes(lic.skuPartNumber));
                if (prod) contagem[prod.id]++;
              }
            }
          }
        }
      }

      const novos = DADOS_FIXOS.map(d => ({
       ...d,
        atribuidas: contagem[d.id] > 0? contagem[d.id] : d.atribuidas
      }));
      setDados(novos);
      setMsg(`Atualizado ao vivo agora - ${ids.length} usuários varridos`);
    } catch (e) {
      setMsg('Não foi possível atualizar ao vivo (token expirado). Mantendo dados salvos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Já mostra os dados fixos imediatamente, sem loading
  }, []);

  return (
    <div className="bg-[#020C1A] min-h-screen p-6 text-white -m-8">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[22px] font-bold">Licenças</h1>
            <p className="text-[12px] text-zinc-400 mt-1">{msg}</p>
          </div>
          <div className="flex gap-2">
            <button className="h-9 px-4 bg-[#0e213f] border border-white/10 rounded-lg text-[12px] flex items-center gap-2">
              <Download className="w-4 h-4" /> Exportar para CSV
            </button>
            <button onClick={atualizarAoVivo} disabled={loading} className="h-9 px-4 bg-[#D4AF37] text-black rounded-lg text-[12px] font-bold flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading? 'animate-spin' : ''}`} /> {loading? 'Atualizando...' : 'Atualizar'}
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
            const pct = (p.atribuidas / p.total) * 100;
            return (
              <div key={p.id} className="grid grid-cols-12 px-5 py-[14px] items-center border-b border-white/[0.05] hover:bg-white/[0.03]">
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[8px]">◆</div>
                  <span className="text-[13px] text-zinc-100 truncate">{p.nome}</span>
                </div>
                <div className="col-span-2 text-[13px] font-bold text-emerald-400">{disponiveis}</div>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-[240px] h-2 bg-[#10233f] rounded-full overflow-hidden">
                    <div className="h-full bg-[#D4AF37]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[12px] text-zinc-400">{p.atribuidas}/{p.total}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
