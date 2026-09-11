import { Box, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function MetricsCards({ data, softwares, onEditSoftware, onRefresh }: any) {

  // Só mostra BALDE (qtd > 0)
  const pools = (softwares || []).filter((s: any) => (s.qtd_contratada || 0) > 0);

  function getUsoDoPool(pool: any) {
    // pega a familia do pool
    const familia = pool.familia || (pool.nome.toLowerCase().includes('single')? 'SINGLE_POOL' : pool.nome.toLowerCase().includes('acrobat')? 'ACROBAT' : pool.nome.toLowerCase().includes('todos')? 'ALL_APPS' : 'OUTROS');

    let total = 0;
    data.forEach((u: any) => {
      (u.softwares || []).forEach((sw: any) => {
        const softReal = softwares.find((s: any) => s.id === (sw.id || sw.software_id || sw));
        if (!softReal) return;

        // Se for OUTROS (AutoCAD) - conta só por ID exato
        if (familia === 'OUTROS') {
          if (softReal.id === pool.id) total++;
          return;
        }
        // Se for SINGLE_POOL - todo app com familia SINGLE_POOL consome do balde de 225
        if (familia === 'SINGLE_POOL' && softReal.familia === 'SINGLE_POOL') {
          total++;
          return;
        }
        // ALL_APPS
        if (familia === 'ALL_APPS' && softReal.familia === 'ALL_APPS') {
          total++;
          return;
        }
        // ACROBAT
        if (familia === 'ACROBAT' && softReal.familia === 'ACROBAT') {
          total++;
          return;
        }
      });
    });
    return total;
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este balde? Vai remover de todos os usuários vinculados.')) return;
    await supabase.from('usuario_softwares').delete().eq('software_id', id);
    await supabase.from('softwares').delete().eq('id', id);
    onRefresh();
  }

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {pools.map((s: any) => {
        const uso = getUsoDoPool(s);
        const livres = (s.qtd_contratada || 0) - uso;
        const perc = Math.min(100, Math.max(0, (uso / (s.qtd_contratada || 1)) * 100));
        const isNegative = livres < 0;

        return (
          <div key={s.id} className="bg-[#001E33] border border-[#1e293b] rounded-xl p-3 relative group">
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => onEditSoftware(s)} className="p-1.5 bg-[#1e293b] rounded hover:bg-[#D4AF37]/20"><Pencil className="w-3 h-3 text-[#D4AF37]" /></button>
              <button onClick={() => handleDelete(s.id)} className="p-1.5 bg-[#1e293b] rounded hover:bg-red-500/20"><Trash2 className="w-3 h-3 text-red-400" /></button>
            </div>
            <p className="text-[11px] text-[#94a3b8] flex gap-1 items-center"><Box className="w-3 h-3" />{s.nome}</p>
            <p className="text-white font-bold text-sm mt-1">{uso} / {s.qtd_contratada} <span className={`text-[11px] font-normal float-right ${isNegative? 'text-red-400' : 'text-sky-400'}`}>{livres} livres</span></p>
            <div className="w-full h-1 bg-[#00121E] rounded mt-2"><div className={`h-1 rounded ${isNegative? 'bg-red-500' : 'bg-[#D4AF37]'}`} style={{ width: `${perc}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}
