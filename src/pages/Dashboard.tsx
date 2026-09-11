import { useMemo } from 'react';
import type { LicencaUsuario, Software } from '@/types';
import { Package, AlertTriangle, CheckCircle, ShieldCheck, Users, HardDrive } from 'lucide-react';

interface DashboardProps {
  softwares: Software[];
  usuarios: LicencaUsuario[];
}

export function DashboardLicencas({ softwares, usuarios }: DashboardProps) {
  const estatisticas = useMemo(() => {
    return softwares.map((sw) => {
      const consumidas = usuarios.filter((u) => {
        const prodUsuario = (u.produto || '').trim().toLowerCase();
        const tipoUsuario = (u.tipo_produto || u.app_individual || '').trim().toLowerCase();
        const swNome = (sw.nome || '').trim().toLowerCase();
        
        if (swNome.includes('acrobat') && prodUsuario.includes('acrobat')) return true;
        if (swNome.includes('todos os apps') && prodUsuario.includes('todos')) return true;
        if (swNome.includes('app individual') && prodUsuario.includes('individual')) return true;
        if (swNome.includes('autodesk') && (prodUsuario.includes('autodesk') || tipoUsuario.includes('autodesk'))) return true;

        return tipoUsuario.split('|').map(s => s.trim()).includes(swNome);
      }).length;

      const total = sw.qtd_licencas || sw.quantidade_total || 0;
      const disponivel = total - consumidas;
      const percentual = total > 0 ? Math.min(100, Math.round((consumidas / total) * 100)) : 0;

      return {
        ...sw,
        consumidas,
        disponivel,
        percentual,
      };
    });
  }, [softwares, usuarios]);

  return (
    <div className="space-y-4">
      <h3 className="text-white font-bold text-base flex items-center gap-2">
        <Package className="w-5 h-5 text-[#D4AF37]" /> Consumo de Licenças por Categoria
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {estatisticas.map((item) => {
          const alerta = item.disponivel < 0;
          return (
            <div key={item.id || item.nome} className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4 space-y-3 shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-white font-bold text-sm">{item.nome}</h4>
                  <p className="text-[#94a3b8] text-xs">{item.fabricante || 'Licenciamento'}</p>
                </div>
                {alerta ? (
                  <span className="flex items-center gap-1 text-rose-400 text-xs bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                    <AlertTriangle className="w-3 h-3" /> Estouro
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle className="w-3 h-3" /> Regular
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#94a3b8]">Alocadas: <strong className="text-white">{item.consumidas}</strong></span>
                  <span className="text-[#94a3b8]">Total: <strong className="text-[#D4AF37]">{item.qtd_licencas || item.quantidade_total || 0}</strong></span>
                </div>
                <div className="w-full bg-[#001726] rounded-full h-2 overflow-hidden border border-[#1e293b]">
                  <div 
                    className={`h-full transition-all duration-500 ${item.percentual > 90 ? 'bg-rose-500' : 'bg-[#D4AF37]'}`} 
                    style={{ width: `${item.percentual}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#1e293b] text-xs text-[#94a3b8]">
                <span>Disponíveis:</span>
                <span className={`font-bold ${item.disponivel < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {item.disponivel} un.
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Dashboard({ softwares, usuarios }: DashboardProps) {
  const totalUsuarios = usuarios.length;
  const totalAtivos = usuarios.filter(u => u.status === 'Ativo').length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#001E33] border border-[#1e293b] rounded-2xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-[#D4AF37]" /> Painel de Controle SERETI-WEB
          </h1>
          <p className="text-[#94a3b8] text-sm mt-1">
            Gestão integrada de licenças de softwares, Active Directory e conformidade de ativos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#001726] border border-[#1e293b] px-4 py-2.5 rounded-xl flex items-center gap-3">
            <Users className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <p className="text-[10px] text-[#94a3b8] uppercase font-semibold">Usuários Mapeados</p>
              <p className="text-white font-bold text-sm">{totalUsuarios} ({totalAtivos} ativos)</p>
            </div>
          </div>
          <div className="bg-[#001726] border border-[#1e293b] px-4 py-2.5 rounded-xl flex items-center gap-3">
            <HardDrive className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <p className="text-[10px] text-[#94a3b8] uppercase font-semibold">Softwares Monitorados</p>
              <p className="text-white font-bold text-sm">{softwares.length} pacotes</p>
            </div>
          </div>
        </div>
      </div>

      <DashboardLicencas softwares={softwares} usuarios={usuarios} />
    </div>
  );
}

export default Dashboard;
