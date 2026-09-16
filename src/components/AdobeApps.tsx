import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Download, ShieldCheck } from 'lucide-react';

type AdobeItem = {
  id: string;
  nome: string;
  total: number;
  atribuidas: number;
  tag: string;
};

// DADOS DO SEU PRINT - CARREGA NA HORA, SEM TRAVAR
const DADOS_FIXOS: AdobeItem[] = [
  { id: 'single', nome: 'Aplicativo Individual - Edição 4', total: 225, atribuidas: 189, tag: 'API disponível' },
  { id: 'fonts', nome: 'Fontes personalizadas', total: 9, atribuidas: 9, tag: '' },
  { id: 'allapps', nome: 'Todos os Apps - Edição 4', total: 202, atribuidas: 192, tag: 'API disponível' },
  { id: 'acrobat', nome: 'Acrobat Pro DC', total: 202, atribuidas: 200, tag: 'API disponível' },
];

export function AdobeApps() {
  const [dados, setDados] = useState(DADOS_FIXOS);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('Dados do Adobe Admin Console - 16/09/2026 | Org: 2DED2FE5...');

  const carregar = async () => {
    setLoading(true);
    setMsg('Conectando na Adobe UMAPI...');
    try {
      // tenta com o nome que você criou no print, se falhar tenta o nome curto
      let data, error;
      const tentativa1 = await supabase.functions.invoke('supabase-functions-adobe-licenses-index-ts');
      if (tentativa1.error) {
        const tentativa2 = await supabase.functions.invoke('adobe-licenses');
        data = tentativa2.data; error = tentativa2.error;
      } else {
        data = tentativa1.data; error = tentativa1.error;
      }

      if (error) throw error;

      const groups = data?.groups?.groups || data?.groups || [];
      const products = data?.products?.products || data?.products || [];

      if (groups.length === 0 && products.length === 0) {
        setMsg('API respondeu vazia. Verifique as Secrets ADOBE_API_KEY e ADOBE_ACCESS_TOKEN no Supabase.');
        setLoading(false);
        return;
      }

      // Atualiza com dados reais se a API retornar
      const novos = DADOS_FIXOS.map(fixo => {
        const match = groups.find((g: any) =>
          (g.groupName && fixo.nome.includes(g.groupName.split(' -')[0])) ||
          (g.productName && fixo.nome.includes(g.productName))
        );
        if (match && match.memberCount!== undefined) {
          return {
          ...fixo,
            atribuidas: match.memberCount,
            total: Number(match.licenseQuota) || fixo.total
          };
        }
        return fixo;
      });

      setDados(novos);
      setMsg(`Atualizado ao vivo via Adobe UMAPI - ${new Date().toLocaleTimeString()} - ${groups.length} perfis encontrados`);
    } catch (e: any) {
      console.error(e);
      setMsg('Sem credencial Adobe válida. Mostrando dados salvos do seu print. Configure as Secrets na Edge Function.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#020C1A] min-h-screen p-6 text-white -m-8">
      <div className="max-w-[1100px] mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold">Adobe - Licenças</h1>
              <span className="text-[10px] px-2 py-1 rounded bg-[#FF0000]/20 border border-[#FF0000]/30 text-red-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> @senado
              </span>
            </div>
            <p className="text-[12px] text-zinc-400 mt-1">{msg}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const csv = "Nome,Total,Atribuidas,Disponiveis\n" + dados.map(d => `${d.nome},${d.total},${d.atribuidas},${d.total - d.atribuidas}`).join("\n");
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'adobe_licencas.csv'; a.click();
              }}
              className="h-9 px-4 bg-[#0e213f] border border-white/10 rounded-lg text-[12px] flex items-center gap-2 hover:bg-white/10"
            >
              <Download className="w-4 h-4" /> Exportar para CSV
            </button>
            <button
              onClick={carregar}
              disabled={loading}
              className="h-9 px-4 bg-[#D4AF37] text-black rounded-lg text-[12px] font-bold flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading? 'animate-spin' : ''}`} />
              {loading? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>

        {/* TABELA NO ESTILO ARGUS ESCURO */}
        <div className="bg-[#0a1930] border border-white/10 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10">
            <div className="col-span-6">Nome</div>
            <div className="col-span-2">Quantidade</div>
            <div className="col-span-1">Tags</div>
            <div className="col-span-3">Licenças atribuídas</div>
          </div>

          {dados.map(p => {
            const disponiveis = p.total - p.atribuidas;
            const pct = Math.min(100, Math.max(0, (p.atribuidas / p.total) * 100));
            return (
              <div
                key={p.id}
                className="grid grid-cols-12 px-5 py-[14px] items-center border-b border-white/[0.05] hover:bg-white/[0.03] transition"
              >
                <div className="col-span-6 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-[#FF0000] to-[#FF6A00] flex items-center justify-center text-[12px] font-black text-white">A</div>
                  <span className="text-[13px] text-zinc-100 truncate">{p.nome}</span>
                </div>
                <div className="col-span-2 text-[13px]">
                  <span className="font-bold text-white">{p.atribuidas}</span>
                  <span className="text-zinc-400"> de {p.total}</span>
                  <div className={`text-[11px] ${disponiveis < 10? 'text-amber-400' : 'text-emerald-400'}`}>
                    {disponiveis} disponíveis
                  </div>
                </div>
                <div className="col-span-1">
                  {p.tag && <span className="text-[10px] px-2 py-1 rounded bg-white/10 border border-white/20 text-zinc-300">{p.tag}</span>}
                </div>
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-[160px] h-2 bg-[#10233f] rounded-full overflow-hidden">
                    <div className="h-full bg-[#D4AF37] transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[12px] text-zinc-400">{p.atribuidas}/{p.total}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between mt-3">
          <p className="text-[11px] text-zinc-500">
            Fonte: Adobe Admin Console (Org 2DED2FE5...). Autenticação @senado via Federated ID. Total fixo do console.
          </p>
          <p className="text-[11px] text-zinc-500">
            {dados.reduce((a,b) => a + b.atribuidas, 0)} licenças ativas no total
          </p>
        </div>
      </div>
    </div>
  );
}
