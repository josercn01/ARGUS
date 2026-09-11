import { Box, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function MetricsCards({ data, softwares, onEditSoftware, onRefresh }: any) {
  const pools = (softwares || []).filter((s: any) => (s.qtd_contratada || 0) > 0);

  function getUsoDoPool(pool: any) {
    const familia = pool.familia;
    // Para SINGLE_POOL conta PESSOAS distintas, não licenças
    if (familia === 'SINGLE_POOL') {
      const pessoasComSingle = new Set<string>();
      data.forEach((u: any) => {
        const temSingle = (u.softwares || []).some((sw: any) => {
          const real = softwares.find((s: any) => s.id === (sw.id || sw.software_id));
          return real?.familia === 'SINGLE_POOL';
        });
        if (temSingle) pessoasComSingle.add(u.id);
      });
      return pessoasComSingle.size;
    }

    // Para os outros baldes conta atribuições normais
    let total = 0;
    data.forEach((u: any) => {
      (u.softwares || []).forEach((sw: any) => {
        const real = softwares.find((s: any) => s.id === (sw.id || sw.software_id));
        if (!real) return;
        if (familia === 'OUTROS' && real.id === pool.id) total++;
        if (familia === 'ALL_APPS' && real.familia === 'ALL_APPS') total++;
        if (familia === 'ACROBAT' && real.familia === 'ACROBAT') total++;
      });
    });
    return total;
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este balde?')) return;
    await supabase.from('usuario_softwares').delete().eq('software_id', id);
    await supabase.from('softwares').delete().eq('id', id);
    onRefresh();
  }

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {pools.map((s: any) => {
        const uso = getUsoDoPool(s);
        const livres = (s.qtd_contratada || 0) - uso;
        const perc = Math.min(100, (uso / (s.qtd_contratada || 1)) * 100);
        const isOver = livres < 0;
        return (
          <div key={s.id} className="bg-[#001E33] border border-[#1e293b] rounded-xl p-3 relative group">
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => onEditSoftware(s)} className="p-1.5 bg-[#1e293b] rounded"><Pencil className="w-3 h-3 text-[#D4AF37]" /></button>
              <button onClick={() => handleDelete(s.id)} className="p-1.5 bg-[#1e293b] rounded"><Trash2 className="w-3 h-3 text-red-400" /></button>
            </div>
            <p className="text-[11px] text-[#94a3b8] flex gap-1"><Box className="w-3 h-3" />{s.nome}</p>
            <p className="text-white font-bold text-sm mt-1">{uso} / {s.qtd_contratada} <span className={`text-[11px] float-right ${isOver? 'text-red-400' : 'text-sky-400'}`}>{livres} livres</span></p>
            <div className="w-full h-1 bg-[#00121E] rounded mt-2"><div className={`h-1 rounded ${isOver? 'bg-red-500' : 'bg-[#D4AF37]'}`} style={{ width: `${perc}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}
