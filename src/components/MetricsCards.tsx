import { Users, CheckCircle, FileText, Clock, Package, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import type { LicencaUsuario, Software } from '@/types';

interface MetricsCardsProps {
  data: LicencaUsuario[];
  softwares?: Software[];
}

export function MetricsCards({ data, softwares }: MetricsCardsProps) {
  const total = data.length;
  const ativas = data.filter((l) => l.status === 'Ativo').length;
  const pendentes = data.filter((l) => l.status === 'Pendente').length;
  const semLicenca = data.filter((l) => !l.possui_licenca).length;

  const cards = [
    {
      label: 'Total de Usuários',
      value: total,
      icon: Users,
      color: 'text-[#D4AF37]',
      bg: 'bg-[#D4AF37]/10',
      border: 'border-[#D4AF37]/20',
    },
    {
      label: 'Licenças Ativas',
      value: ativas,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Pendentes',
      value: pendentes,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      label: 'Sem Licença',
      value: semLicenca,
      icon: AlertCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
  ];

  // Chart data: top softwares by assigned licenses
  const chartData = (softwares ?? [])
    .map((sw) => {
      const assigned = data.filter(
        (l) => l.possui_licenca && (
          l.tipo_licenca?.toLowerCase() === sw.nome.toLowerCase() ||
          l.produto?.toLowerCase() === (sw.produto ?? sw.nome).toLowerCase()
        )
      ).length;
      return {
        name: sw.produto ?? sw.nome,
        atribuidas: assigned,
        total: sw.qtd_licencas,
      };
    })
    .sort((a, b) => b.atribuidas - a.atribuidas)
    .slice(0, 10);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`bg-[#001E33] border ${card.border} rounded-xl p-4 shadow-lg flex items-center gap-3 transition-transform hover:-translate-y-0.5 duration-200`}
          >
            <div className={`p-2.5 rounded-lg ${card.bg}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-[#94a3b8] text-xs font-medium">{card.label}</p>
              <p className="text-white text-xl font-bold mt-0.5">{card.value.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        ))}
        {/* Softwares count card */}
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4 shadow-lg flex items-center gap-3 transition-transform hover:-translate-y-0.5 duration-200">
          <div className="p-2.5 rounded-lg bg-sky-500/10">
            <Package className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <p className="text-[#94a3b8] text-xs font-medium">Softwares</p>
            <p className="text-white text-xl font-bold mt-0.5">{(softwares ?? []).length}</p>
          </div>
        </div>
      </div>

      {/* Chart: Licenses by Software */}
      {chartData.length > 0 && (
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-5 shadow-xl">
          <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#D4AF37]" />
            Licenças Atribuídas por Produto (Top 10)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={70}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: '#001726' }}
                contentStyle={{
                  background: '#001E33',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  fontSize: '12px',
                  color: '#ffffff',
                }}
                labelStyle={{ color: '#D4AF37', fontWeight: 600 }}
              />
              <Bar dataKey="atribuidas" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.atribuidas > entry.total ? '#ef4444' : '#D4AF37'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-software breakdown */}
      {softwares && softwares.length > 0 && (
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4 shadow-xl">
          <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#D4AF37]" />
            Capacidade por Software
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {softwares.map((sw) => {
              const assigned = data.filter(
                (l) => l.possui_licenca && (
                  l.tipo_licenca?.toLowerCase() === sw.nome.toLowerCase() ||
                  l.produto?.toLowerCase() === (sw.produto ?? sw.nome).toLowerCase()
                )
              ).length;
              const available = sw.qtd_licencas - assigned;
              const pct = sw.qtd_licencas > 0 ? Math.min((assigned / sw.qtd_licencas) * 100, 100) : 0;
              return (
                <div key={sw.id} className="bg-[#001726] border border-[#1e293b] rounded-lg p-3">
                  <p className="text-white text-sm font-medium truncate">{sw.nome}</p>
                  {sw.produto && (
                    <p className="text-[#D4AF37] text-xs truncate mt-0.5">{sw.produto}</p>
                  )}
                  {sw.tipo_produto && (
                    <p className="text-[#64748b] text-xs truncate">{sw.tipo_produto}</p>
                  )}
                  {/* Capacity bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#94a3b8]">{assigned} usadas</span>
                      <span className="text-[#94a3b8]">/ {sw.qtd_licencas}</span>
                    </div>
                    <div className="w-full bg-[#001E33] border border-[#1e293b] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          available < 0 ? 'bg-red-500' : available <= 5 && sw.qtd_licencas > 0 ? 'bg-amber-500' : 'bg-[#D4AF37]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {available < 0 && (
                      <span className="text-red-400 text-xs mt-1 block">Excedido em {Math.abs(available)}</span>
                    )}
                    {available >= 0 && available <= 5 && sw.qtd_licencas > 0 && (
                      <span className="text-amber-400 text-xs mt-1 block">{available} restantes</span>
                    )}
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
