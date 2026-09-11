import { useMemo } from 'react';
import type { UsuarioLicenca, Software } from '@/types';

export function MetricsCards({ data, softwares }: { data: UsuarioLicenca[], softwares: Software[] }) {
  const stats = useMemo(() => {
    const total = softwares.filter(s=>s.qtd_contratada>0).reduce((acc,s)=>acc+s.qtd_contratada,0); // 629
    const emUso = data.length; // 577 da sua planilha
    const livres = total - emUso; // 52
    const taxa = total>0? Math.round(emUso/total*100) : 0;
    return { total, emUso, livres, taxa };
  }, [data, softwares]);

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">TOTAL CONTRATADO</p><p className="text-2xl font-bold text-white mt-2">{stats.total}</p><p className="text-[11px] text-[#64748b] mt-1">{softwares.filter(s=>s.qtd_contratada>0).map(s=>s.qtd_contratada).join(' + ')}</p></div>
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">EM USO</p><p className="text-2xl font-bold text-emerald-400 mt-2">{stats.emUso}</p><p className="text-[11px] text-[#64748b] mt-1">Atribuidas aos usuarios</p></div>
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">DISPONIVEIS (LIVRE)</p><p className="text-2xl font-bold text-sky-400 mt-2">{stats.livres}</p><p className="text-[11px] text-[#64748b] mt-1">Estoque pronto</p></div>
      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">TAXA DE UTILIZACAO</p><p className="text-2xl font-bold text-[#D4AF37] mt-2">{stats.taxa}%</p></div>
    </div>
  );
}
