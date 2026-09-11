import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Download, Upload, Plus, Trash2, Pencil, CheckCircle, ChevronDown } from 'lucide-react';

type Licenca = {
  id: string;
  colaborador: string;
  email: string;
  login: string;
  setor: string;
  software: string;
  licenca: string;
  status: string;
};

type SoftwareResumo = {
  nome: string;
  tipo: string;
  total: number;
  emUso: number;
  livre: number;
  ocupacao: number;
  detalhe?: { nome: string; qtd: number }[];
};

export function GestaoLicencas() {
  const [licencas, setLicencas] = useState<Licenca[]>([]);
  const [softwaresResumo, setSoftwaresResumo] = useState<SoftwareResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroSoftware, setFiltroSoftware] = useState('Todos os Softwares');
  const [excluindoTudo, setExcluindoTudo] = useState(false);

  async function loadData() {
    setLoading(true);
    // Carrega licenças (usuários)
    const { data: licData } = await supabase.from('licencas_usuarios').select('*').order('colaborador');
    if (licData) setLicencas(licData as any);

    // Carrega softwares para calcular total contratado
    const { data: softData } = await supabase.from('softwares').select('*');
    
    // Calcula resumo igual do seu print
    if (softData && licData) {
      const resumo = softData.map((s: any) => {
        const emUso = licData.filter((l: any) => 
          l.software?.toLowerCase().includes(s.nome.toLowerCase()) || 
          l.software?.toLowerCase().includes(s.produto?.toLowerCase() || '')
        ).length;
        const total = s.qtd_licencas || s.quantidade_total || 0;
        return {
          nome: s.nome,
          tipo: s.tipo_produto,
          total,
          emUso,
          livre: total - emUso,
          ocupacao: total > 0 ? Math.round((emUso / total) * 100) : 0,
        };
      });
      setSoftwaresResumo(resumo);
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const licencasFiltradas = useMemo(() => {
    return licencas.filter(l => {
      const matchBusca = !busca || 
        l.colaborador.toLowerCase().includes(busca.toLowerCase()) ||
        l.email.toLowerCase().includes(busca.toLowerCase()) ||
        l.login.toLowerCase().includes(busca.toLowerCase());
      const matchSoftware = filtroSoftware === 'Todos os Softwares' || l.software === filtroSoftware;
      return matchBusca && matchSoftware;
    });
  }, [licencas, busca, filtroSoftware]);

  // FUNÇÃO EXCLUIR TODOS OS REGISTROS - QUE VOCÊ PEDIU
  async function handleExcluirTodosRegistros() {
    const total = licencas.length;
    if (total === 0) return;

    const c1 = window.confirm(`ATENÇÃO: Apagar TODOS os ${total} registros de Gestão de Licenças?\n\nIsso vai zerar EM USO e voltar para LIVRE 720.\n\nContinuar?`);
    if (!c1) return;
    const c2 = window.confirm(`CONFIRMAÇÃO FINAL: Apagar ${total} registros DEFINITIVAMENTE? Não pode ser desfeito.`);
    if (!c2) return;

    setExcluindoTudo(true);
    try {
      const { error } = await supabase.from('licencas_usuarios').delete().neq('email', '');
      if (error) throw error;
      setLicencas([]);
      await loadData();
      alert(`${total} registros excluídos com sucesso.`);
    } catch (err: any) {
      alert('Erro: ' + err.message + '\n\nRode no Supabase SQL:\nCREATE POLICY "allow delete" ON public.licencas_usuarios FOR DELETE USING (true);');
    } finally {
      setExcluindoTudo(false);
    }
  }

  async function handleDeleteUm(id: string) {
    if (!confirm('Excluir este registro?')) return;
    await supabase.from('licencas_usuarios').delete().eq('id', id);
    await loadData();
  }

  const totalContratado = softwaresResumo.reduce((a, b) => a + b.total, 0);
  const totalEmUso = licencas.length;
  const totalLivre = totalContratado - totalEmUso;

  return (
    <div className="space-y-6 p-4 bg-[#000f1a] min-h-screen">
      {/* CARDS RESUMO - IGUAL SEU PRINT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {softwaresResumo.map((s) => (
          <div key={s.nome} className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4">
            <h3 className="text-white font-bold text-sm">{s.nome}</h3>
            <p className="text-[#64748b] text-xs">{s.tipo} • {s.total} licenças</p>
            <div className="grid grid-cols-3 gap-2 mt-3 bg-[#001726] rounded-lg p-3">
              <div className="text-center"><p className="text-[#64748b] text-[10px]">TOTAL</p><p className="text-white font-bold">{s.total}</p></div>
              <div className="text-center"><p className="text-[#64748b] text-[10px]">EM USO</p><p className="text-emerald-400 font-bold">{s.emUso}</p></div>
              <div className="text-center"><p className="text-[#64748b] text-[10px]">LIVRE</p><p className="text-blue-400 font-bold">{s.livre}</p></div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-[#94a3b8] mb-1"><span>Ocupação</span><span>{s.ocupacao}%</span></div>
              <div className="h-1 bg-[#001726] rounded-full"><div className="h-1 bg-[#facc15] rounded-full" style={{width: `${s.ocupacao}%`}} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* BARRA DE FILTROS + BOTÕES - EXATAMENTE SEU PRINT */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, e-mail, login ou chapa/matrícula" className="w-full bg-[#001E33] border border-[#1e293b] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#64748b]" />
          </div>
          <select value={filtroSoftware} onChange={e => setFiltroSoftware(e.target.value)} className="bg-[#001E33] border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-white">
            <option>Todos os Softwares</option>
            {softwaresResumo.map(s => <option key={s.nome} value={s.nome}>{s.nome}</option>)}
          </select>
          <select className="bg-[#001E33] border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-white"><option>Todos os Locais</option></select>
          <select className="bg-[#001E33] border border-[#1e293b] rounded-lg px-4 py-2.5 text-sm text-white"><option>Todos os Status</option></select>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div>
            <h2 className="text-white font-bold flex items-center gap-2">👥 Gestão de Licenças</h2>
            <p className="text-[#94a3b8] text-sm">{licencasFiltradas.length} registro(s).</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#001E33] border border-[#1e293b] text-[#94a3b8] text-sm"><Download className="w-4 h-4" />Exportar</button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#001E33] border border-[#1e293b] text-[#94a3b8] text-sm"><Upload className="w-4 h-4" />Importar</button>
            
            {/* BOTÃO QUE VOCÊ PEDIU AQUI */}
            {licencas.length > 0 && (
              <button
                onClick={handleExcluirTodosRegistros}
                disabled={excluindoTudo}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-950/60 border border-red-900/50 text-red-400 hover:bg-red-900/60 hover:text-red-300 text-sm font-bold transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {excluindoTudo ? 'Excluindo...' : `Excluir todos (${licencas.length})`}
              </button>
            )}

            <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#facc15] text-black font-bold text-sm"><Plus className="w-4 h-4" />Novo Registro</button>
          </div>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#001726] border-b border-[#1e293b]">
              <tr>
                <th className="px-4 py-3 text-xs text-[#94a3b8]">COLABORADOR</th>
                <th className="px-4 py-3 text-xs text-[#94a3b8]">LOGIN</th>
                <th className="px-4 py-3 text-xs text-[#94a3b8]">SETOR</th>
                <th className="px-4 py-3 text-xs text-[#94a3b8]">SOFTWARE</th>
                <th className="px-4 py-3 text-xs text-[#94a3b8]">LICENÇA</th>
                <th className="px-4 py-3 text-xs text-[#94a3b8]">STATUS</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading && <tr><td colSpan={7} className="text-center py-8 text-[#94a3b8]">Carregando...</td></tr>}
              {!loading && licencasFiltradas.map(l => (
                <tr key={l.id} className="hover:bg-[#001726]/50">
                  <td className="px-4 py-3"><p className="text-white text-sm font-medium">{l.colaborador}</p><p className="text-[#64748b] text-xs">{l.email}</p></td>
                  <td className="px-4 py-3 text-[#94a3b8] text-sm">{l.login}</td>
                  <td className="px-4 py-3 text-[#94a3b8] text-sm">{l.setor}</td>
                  <td className="px-4 py-3 text-[#D4AF37] text-sm">{l.software}</td>
                  <td className="px-4 py-3 text-emerald-400 text-sm flex items-center gap-1"><CheckCircle className="w-3 h-3" />Possui</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">● Ativo</span></td>
                  <td className="px-4 py-3"><div className="flex gap-2"><Pencil className="w-4 h-4 text-[#64748b] cursor-pointer" /><Trash2 onClick={() => handleDeleteUm(l.id)} className="w-4 h-4 text-[#64748b] hover:text-red-400 cursor-pointer" /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
