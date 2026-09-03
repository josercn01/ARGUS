import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  RefreshCw, 
  Search, 
  BarChart3,
  Layers,
  Sparkles
} from 'lucide-react';
import type { LicencaUsuario } from '@/types';

interface SoftwareMetric {
  id: string;
  nome: string;
  fabricante?: string;
  quantidade_total: number;
  quantidade_em_uso: number;
  quantidade_livre: number;
  percentual_uso: number;
}

export function Dashboard() {
  const [softwaresMetrics, setSoftwaresMetrics] = useState<SoftwareMetric[]>([]);
  const [usuarios, setUsuarios] = useState<LicencaUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Métrica Globais Acumuladas
  const totalLicencasCompradas = softwaresMetrics.reduce((acc, item) => acc + item.quantidade_total, 0);
  const totalLicencasEmUso = softwaresMetrics.reduce((acc, item) => acc + item.quantidade_em_uso, 0);
  const totalLicencasLivres = totalLicencasCompradas - totalLicencasEmUso;
  const taxaOcupacaoGlobal = totalLicencasCompradas > 0 
    ? Math.round((totalLicencasEmUso / totalLicencasCompradas) * 100) 
    : 0;

  async function loadDashboardData() {
    setLoading(true);

    // 1. Busca os softwares cadastrados no inventário
    const { data: listSoftwares, error: swError } = await supabase
      .from('softwares')
      .select('*')
      .order('nome');

    // 2. Busca os vínculos de usuários com softwares/produtos
    const { data: listUsuarios, error: usrError } = await supabase
      .from('licencas_usuarios')
      .select('*');

    if (!swError && !usrError && listSoftwares && listUsuarios) {
      setUsuarios(listUsuarios as LicencaUsuario[]);

      // Calculando em uso x livre para cada software
      const metrics: SoftwareMetric[] = listSoftwares.map((sw) => {
        const total = sw.quantidade_total || sw.quantidade || 0;

        // Conta quantos usuários possuem esse software/produto atribuído
        const emUso = listUsuarios.filter((u) => {
          if (!u.possui_licenca) return false;
          const prodUser = (u.produto || u.tipo_licenca || '').toLowerCase().trim();
          const swNome = (sw.nome || '').toLowerCase().trim();
          return prodUser.includes(swNome) || swNome.includes(prodUser);
        }).length;

        const livre = Math.max(0, total - emUso);
        const percentual = total > 0 ? Math.min(100, Math.round((emUso / total) * 100)) : 0;

        return {
          id: sw.id,
          nome: sw.nome,
          fabricante: sw.fabricante || sw.tipo_licenca,
          quantidade_total: total,
          quantidade_em_uso: emUso,
          quantidade_livre: livre,
          percentual_uso: percentual,
        };
      });

      setSoftwaresMetrics(metrics);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  const filteredMetrics = softwaresMetrics.filter((sw) =>
    sw.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sw.fabricante && sw.fabricante.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-[#001726] space-y-8 text-slate-100">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-[#0078D4]" />
            Painel Executivo de Softwares
          </h1>
          <p className="text-[#94a3b8] text-sm mt-1">
            Gestão em tempo real de licenças compradas, alocadas e estoque disponível.
          </p>
        </div>

        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-semibold bg-[#001E33] hover:bg-[#002B4D] border border-[#1e293b] hover:border-[#0078D4] text-white px-4 py-2.5 rounded-lg transition-all cursor-pointer shadow-md"
        >
          <RefreshCw className={`w-4 h-4 text-[#0078D4] ${loading ? 'animate-spin' : ''}`} />
          Recarregar Métricas
        </button>
      </div>

      {/* 1. RESUMO EXECUTIVO (KPI CARDS GLOBAIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contratado */}
        <div className="bg-[#001726] border border-[#1e293b] rounded-xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wider">Total de Licenças</p>
              <h3 className="text-3xl font-bold text-white mt-2">{totalLicencasCompradas}</h3>
            </div>
            <div className="p-3 bg-[#001E33] border border-[#1e293b] rounded-xl text-[#0078D4]">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-[#94a3b8] mt-3 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Capacidade total inventariada
          </p>
        </div>

        {/* Licenças Em Uso */}
        <div className="bg-[#001726] border border-[#1e293b] rounded-xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wider">Em Uso / Atribuidas</p>
              <h3 className="text-3xl font-bold text-emerald-400 mt-2">{totalLicencasEmUso}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-[#94a3b8] mt-3">Alocadas para colaboradores</p>
        </div>

        {/* Licenças Livres */}
        <div className="bg-[#001726] border border-[#1e293b] rounded-xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wider">Disponíveis (Livre)</p>
              <h3 className="text-3xl font-bold text-sky-400 mt-2">{totalLicencasLivres}</h3>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-[#94a3b8] mt-3">Prontas para novos usuários</p>
        </div>

        {/* Taxa de Utilização */}
        <div className="bg-[#001726] border border-[#1e293b] rounded-xl p-5 relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#94a3b8] text-xs font-medium uppercase tracking-wider">Taxa de Ocupação</p>
              <h3 className="text-3xl font-bold text-amber-400 mt-2">{taxaOcupacaoGlobal}%</h3>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
          <div className="w-full bg-[#001E33] h-2 rounded-full mt-3 overflow-hidden border border-[#1e293b]">
            <div 
              className="bg-amber-400 h-full transition-all duration-500" 
              style={{ width: `${taxaOcupacaoGlobal}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. CARDS DE SOFTWARES COM BARRAS DE OCUPAÇÃO */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            Visão Individual por Software
            <span className="text-xs bg-[#001E33] border border-[#1e293b] text-[#0078D4] px-2.5 py-0.5 rounded-full font-mono">
              {filteredMetrics.length} Softwares
            </span>
          </h2>

          {/* Busca de Softwares */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar software..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#001E33] border border-[#1e293b] focus:border-[#0078D4] text-white text-xs rounded-lg pl-9 pr-3 py-2 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Grid de Cards por Software */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMetrics.map((sw) => {
            const isCritical = sw.quantidade_livre === 0 && sw.quantidade_total > 0;
            const isWarning = sw.percentual_uso >= 85 && !isCritical;

            return (
              <div 
                key={sw.id} 
                className="bg-[#001726] border border-[#1e293b] hover:border-[#0078D4]/50 rounded-xl p-5 transition-all shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-white text-base leading-tight">{sw.nome}</h3>
                      {sw.fabricante && (
                        <span className="text-xs text-[#94a3b8] font-medium block mt-0.5">{sw.fabricante}</span>
                      )}
                    </div>
                    {isCritical ? (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase flex items-center gap-1 shrink-0">
                        <AlertTriangle className="w-3 h-3" /> Esgotado
                      </span>
                    ) : isWarning ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase shrink-0">
                        Atenção
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase shrink-0">
                        Normal
                      </span>
                    )}
                  </div>

                  {/* Números em Destaque */}
                  <div className="grid grid-cols-3 gap-2 my-4 bg-[#001E33] border border-[#1e293b] rounded-lg p-3 text-center">
                    <div>
                      <p className="text-[10px] text-[#94a3b8] font-medium uppercase">Total</p>
                      <p className="text-lg font-bold text-white">{sw.quantidade_total}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#94a3b8] font-medium uppercase">Em Uso</p>
                      <p className="text-lg font-bold text-emerald-400">{sw.quantidade_em_uso}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#94a3b8] font-medium uppercase">Livre</p>
                      <p className="text-lg font-bold text-sky-400">{sw.quantidade_livre}</p>
                    </div>
                  </div>
                </div>

                {/* Barra de Progresso do Software */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-[#94a3b8]">Ocupação</span>
                    <span className="font-semibold text-white">{sw.percentual_uso}%</span>
                  </div>
                  <div className="w-full bg-[#001E33] h-2 rounded-full overflow-hidden border border-[#1e293b]">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-[#0078D4]'
                      }`}
                      style={{ width: `${sw.percentual_uso}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
