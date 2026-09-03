import { useMemo } from 'react';
import { Package, Users, CheckCircle2, Sparkles, Layers, AlertTriangle } from 'lucide-react';
import type { LicencaUsuario, Software } from '@/types';

interface MetricsCardsProps {
  data: LicencaUsuario[];
  softwares: Software[];
}

interface SoftwareMetric {
  id: string;
  nome: string;
  fabricante?: string;
  total: number;
  emUso: number;
  livre: number;
  percentual: number;
}

export function MetricsCards({ data: usuarios, softwares }: MetricsCardsProps) {
  const { metrics, totalGlobal, emUsoGlobal, livreGlobal, ocupacaoGlobal } = useMemo(() => {
    let globalTotal = 0;
    let globalEmUso = 0;

    const listMetrics: SoftwareMetric[] = softwares.map((sw) => {
      const total = Number(sw.qtd_licencas || sw.quantidade_total || sw.quantidade || 0);

      const emUso = usuarios.filter((u) => {
        if (!u.possui_licenca) return false;
        const prodUser = `${u.produto || ''} ${u.tipo_licenca || ''}`.toLowerCase().trim();
        const swNome = (sw.nome || '').toLowerCase().trim();
        const swProd = (sw.produto || '').toLowerCase().trim();
        return (
          (swNome && prodUser.includes(swNome)) ||
          (swProd && prodUser.includes(swProd)) ||
          (swNome && swNome.includes(prodUser))
        );
      }).length;

      const livre = Math.max(0, total - emUso);
      const percentual = total > 0 ? Math.min(100, Math.round((emUso / total) * 100)) : 0;

      globalTotal += total;
      globalEmUso += emUso;

      return {
        id: sw.id,
        nome: sw.nome,
        fabricante: sw.fabricante || sw.tipo_produto,
        total,
        emUso,
        livre,
        percentual,
      };
    });

    const globalLivre = Math.max(0, globalTotal - globalEmUso);
    const globalOcupacao = globalTotal > 0 ? Math.round((globalEmUso / globalTotal) * 100) : 0;

    return {
      metrics: listMetrics,
      totalGlobal: globalTotal,
      emUsoGlobal: globalEmUso,
      livreGlobal: globalLivre,
      ocupacaoGlobal: globalOcupacao,
    };
  }, [usuarios, softwares]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider">Total Contratado</p>
              <h3 className="text-3xl font-bold text-white mt-1.5">{totalGlobal}</h3>
            </div>
            <div className="p-3 bg-[#001726] border border-[#1e293b] rounded-xl text-[#0078D4]">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-[#94a3b8] mt-3 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#0078D4]" /> Soma dos softwares cadastrados
          </p>
        </div>

        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider">Em Uso</p>
              <h3 className="text-3xl font-bold text-emerald-400 mt-1.5">{emUsoGlobal}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-[#94a3b8] mt-3">Atribuídas aos usuários</p>
        </div>

        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider">Disponíveis (Livre)</p>
              <h3 className="text-3xl font-bold text-sky-400 mt-1.5">{livreGlobal}</h3>
            </div>
            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-[#94a3b8] mt-3">Estoque pronto para alocação</p>
        </div>

        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#94a3b8] text-xs font-semibold uppercase tracking-wider">Taxa de Utilização</p>
              <h3 className="text-3xl font-bold text-[#D4AF37] mt-1.5">{ocupacaoGlobal}%</h3>
            </div>
            <div className="p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-xl text-[#D4AF37]">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
          <div className="w-full bg-[#001726] h-2 rounded-full mt-3 overflow-hidden border border-[#1e293b]">
            <div
              className="bg-[#D4AF37] h-full transition-all duration-500"
              style={{ width: `${ocupacaoGlobal}%` }}
            />
          </div>
        </div>
      </div>

      {metrics.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider">
              Disponibilidade por Software
            </h2>
            <span className="text-xs text-[#94a3b8]">{metrics.length} software(s) cadastrado(s)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((sw) => {
              const isEsgotado = sw.livre === 0 && sw.total > 0;
              const isCritico = sw.percentual >= 85 && !isEsgotado;

              return (
                <div
                  key={sw.id}
                  className="bg-[#001E33] border border-[#1e293b] hover:border-[#D4AF37]/40 rounded-xl p-4 transition-all shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-white text-base leading-tight">{sw.nome}</h4>
                        {sw.fabricante && (
                          <span className="text-xs text-[#94a3b8] block mt-0.5">{sw.fabricante}</span>
                        )}
                      </div>
                      {isEsgotado ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase flex items-center gap-1 shrink-0">
                          <AlertTriangle className="w-3 h-3" /> Esgotado
                        </span>
                      ) : isCritico ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase shrink-0">
                          Poucas vagas
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase shrink-0">
                          Normal
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 my-3 bg-[#001726] border border-[#1e293b] rounded-lg p-2.5 text-center">
                      <div>
                        <p className="text-[10px] text-[#94a3b8] uppercase font-semibold">Total</p>
                        <p className="text-base font-bold text-white">{sw.total}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#94a3b8] uppercase font-semibold">Em Uso</p>
                        <p className="text-base font-bold text-emerald-400">{sw.emUso}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#94a3b8] uppercase font-semibold">Livre</p>
                        <p className="text-base font-bold text-sky-400">{sw.livre}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-[#94a3b8]">Ocupação</span>
                      <span className="font-semibold text-white">{sw.percentual}%</span>
                    </div>
                    <div className="w-full bg-[#001726] h-1.5 rounded-full overflow-hidden border border-[#1e293b]">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isEsgotado ? 'bg-rose-500' : isCritico ? 'bg-amber-400' : 'bg-[#0078D4]'
                        }`}
                        style={{ width: `${sw.percentual}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
