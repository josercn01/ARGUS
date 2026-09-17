import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Download, ShieldCheck, AlertCircle } from 'lucide-react';

type AdobeItem = {
  id: string;
  nome: string;
  total: number;
  atribuidas: number;
  tag: string | null;
  org_id: string | null;
  updated_at: string;
};

export function AdobeApps() {
  const [dados, setDados] = useState<AdobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('Carregando...');

  const carregarDoBanco = async () => {
    const { data, error } = await supabase
     .from('adobe_licencas')
     .select('*')
     .order('nome');

    if (!error && data && data.length > 0) {
      setDados(data);
      setMsg(`Dados do banco - Atualizado em ${new Date(data[0].updated_at).toLocaleString('pt-BR')} | Tempo Real ATIVO`);
    } else {
      // Fallback inicial se tabela vazia
      setDados([
        { id: 'single', nome: 'Aplicativo Individual - Edição 4', total: 225, atribuidas: 189, tag: 'API disponível', org_id: '2DED2FE5...', updated_at: new Date().toISOString() },
        { id: 'fonts', nome: 'Fontes personalizadas', total: 9, atribuidas: 9, tag: null, org_id: '2DED2FE5...', updated_at: new Date().toISOString() },
        { id: 'allapps', nome: 'Todos os Apps - Edição 4', total: 202, atribuidas: 192, tag: 'API disponível', org_id: '2DED2FE5...', updated_at: new Date().toISOString() },
        { id: 'acrobat', nome: 'Acrobat Pro DC', total: 202, atribuidas: 200, tag: 'API disponível', org_id: '2DED2FE5...', updated_at: new Date().toISOString() },
      ]);
      setMsg('Tabela vazia - mostrando snapshot inicial. Clique em Atualizar para buscar da Adobe.');
    }
    setLoading(false);
  };

  const sincronizarAdobe = async () => {
    setSyncing(true);
    setMsg('Conectando na Adobe UMAPI...');
    try {
      // Mesma Edge Function que você já tem
      let res = await supabase.functions.invoke('adobe-licenses');
      if (res.error) {
        res = await supabase.functions.invoke('supabase-functions-adobe-licenses-index-ts');
      }
      if (res.error) throw res.error;

      const data = res.data;
      const groups = data?.groups?.groups || data?.groups || [];
      const products = data?.products?.products || data?.products || [];

      if (groups.length === 0 && products.length === 0) {
        setMsg('API respondeu vazia. Verifique Secrets ADOBE_API_KEY / ADOBE_ORG_ID / ADOBE_ACCESS_TOKEN.');
        setSyncing(false);
        return;
      }

      // Converte resposta da Adobe pro formato da tabela
      const novos: AdobeItem[] = groups.map((g: any) => ({
        id: g.groupName?.toLowerCase().replace(/\s+/g,'-') || g.productName?.toLowerCase().replace(/\s+/g,'-'),
        nome: g.groupName || g.productName,
        total: Number(g.licenseQuota) || 0,
        atribuidas: Number(g.memberCount) || 0,
        tag: 'API disponível',
        org_id: data.orgId || '2DED2FE5...',
        updated_at: new Date().toISOString(),
      }));

      // Se a API retornou products em vez de groups
      const listaFinal = novos.length > 0? novos : products.map((p: any) => ({
        id: p.name?.toLowerCase().replace(/\s+/g,'-'),
        nome: p.name,
        total: Number(p.licenseQuota) || 0,
        atribuidas: Number(p.memberCount) || 0,
        tag: 'API disponível',
        org_id: data.orgId,
        updated_at: new Date().toISOString(),
      }));

      if (listaFinal.length > 0) {
        const { error } = await supabase.from('adobe_licencas').upsert(listaFinal, { onConflict: 'id' });
        if (error) throw error;
        // Não precisa setDados aqui - o Realtime vai atualizar sozinho
        setMsg(`Sincronizado ao vivo via Adobe UMAPI - ${new Date().toLocaleTimeString()} - ${listaFinal.length} perfis`);
      }

    } catch (e: any) {
      console.error(e);
      setMsg(`Erro na sync: ${e.message} - Mostrando dados do banco.`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    carregarDoBanco();

    // TEMPO REAL igual Microsoft
    const channel = supabase
     .channel('adobe-licencas-realtime')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'adobe_licencas' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setDados(prev => {
            const idx = prev.findIndex(p => p.id === (payload.new as any).id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = payload.new as AdobeItem;
              return copy;
            }
            return [...prev, payload.new as AdobeItem];
          });
        }
        if (payload.eventType === 'DELETE') {
          setDados(prev => prev.filter(p => p.id!== (payload.old as any).id));
        }
      })
     .subscribe();

    // Auto refresh a cada 60s igual Microsoft Apps
    const interval = setInterval(() => {
      carregarDoBanco();
    }, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const totalAtivas = useMemo(() => dados.reduce((a, b) => a + b.atribuidas, 0), [dados]);
  const totalLicencas = useMemo(() => dados.reduce((a, b) => a + b.total, 0), [dados]);

  if (loading) return <div className="bg-[#020C1A] min-h-screen p-8 text-white -m-8">Carregando licenças Adobe...</div>;

  return (
    <div className="bg-[#020C1A] min-h-screen p-6 text-white -m-8">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold">Adobe - Licenças</h1>
              <span className="text-[10px] px-2 py-1 rounded bg-[#FF0000]/20 border border-[#FF0000]/30 text-red-300 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> @senado - TEMPO REAL
              </span>
              {syncing && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            </div>
            <p className="text-[12px] text-zinc-400 mt-1 flex items-center gap-2">
              {msg.includes('Erro') && <AlertCircle className="w-3 h-3 text-amber-400" />}
              {msg}
            </p>
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
              <Download className="w-4 h-4" /> Exportar
            </button>
            <button
              onClick={sincronizarAdobe}
              disabled={syncing}
              className="h-9 px-4 bg-[#D4AF37] text-black rounded-lg text-[12px] font-bold flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${syncing? 'animate-spin' : ''}`} />
              {syncing? 'Sincronizando...' : 'Atualizar'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-[#0a1930] border border-white/10"><div className="text-[10px] text-zinc-500 uppercase">Total Licenças</div><div className="text-[20px] font-bold">{totalLicencas}</div></div>
          <div className="p-3 rounded-xl bg-[#0a1930] border border-white/10"><div className="text-[10px] text-zinc-500 uppercase">Ativas</div><div className="text-[20px] font-bold text-[#D4AF37]">{totalAtivas}</div></div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><div className="text-[10px] text-emerald-400 uppercase">Disponíveis</div><div className="text-[20px] font-bold text-emerald-300">{totalLicencas - totalAtivas}</div></div>
        </div>

        <div className="bg-[#0a1930] border border-white/10 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 px-5 py-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10">
            <div className="col-span-6">Nome</div>
            <div className="col-span-2">Quantidade</div>
            <div className="col-span-1">Tags</div>
            <div className="col-span-3">Licenças atribuídas</div>
          </div>

          {dados.map(p => {
            const disponiveis = p.total - p.atribuidas;
            const pct = p.total > 0? Math.min(100, Math.max(0, (p.atribuidas / p.total) * 100)) : 0;
            return (
              <div key={p.id} className="grid grid-cols-12 px-5 py-[14px] items-center border-b border-white/[0.05] hover:bg-white/[0.03] transition">
                <div className="col-span-6 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-[#FF0000] to-[#FF6A00] flex items-center justify-center text-[12px] font-black text-white">A</div>
                  <span className="text-[13px] text-zinc-100 truncate">{p.nome}</span>
                </div>
                <div className="col-span-2 text-[13px]">
                  <span className="font-bold text-white">{p.atribuidas}</span>
                  <span className="text-zinc-400"> de {p.total}</span>
                  <div className={`text-[11px] ${disponiveis < 10? 'text-amber-400' : 'text-emerald-400'}`}>{disponiveis} disponíveis</div>
                </div>
                <div className="col-span-1">{p.tag && <span className="text-[10px] px-2 py-1 rounded bg-white/10 border border-white/20 text-zinc-300">{p.tag}</span>}</div>
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
          <p className="text-[11px] text-zinc-500">Fonte: Adobe Admin Console (Org {dados[0]?.org_id || '2DED2FE5...'}). Realtime via Supabase.</p>
          <p className="text-[11px] text-zinc-500">{totalAtivas} licenças ativas no total • {dados.length} produtos</p>
        </div>
      </div>
    </div>
  );
}
