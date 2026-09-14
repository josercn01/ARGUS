import { useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function MetricsCards({ data, softwares, onEditSoftware, onRefresh }: any) {
  const stats = useMemo(() => {
    const contratados = softwares.filter((s:any)=>s.qtd_contratada>0);
    const total = contratados.reduce((a:any,b:any)=>a+b.qtd_contratada,0);

    let usadosAcrobat = 0;
    let usadosTodos = 0;
    let usadosSingle = 0;
    let usadosAutocad = 0;

    data.forEach((u:any)=>{
      const softs = (u.softwares||[]).map((s:any)=>s.nome.toLowerCase());
      const hasTodos = softs.some((n:string)=> n.includes('todos') || n.includes('all apps') || (n.includes('creative cloud') && n.includes('todos')) );
      const isTodosUser = hasTodos || softs.some((n:string)=> n.includes('todos os apps - edicao'));

      if (isTodosUser) {
        usadosTodos += 1;
      } else {
        softs.forEach((n:string)=>{
          if (n.includes('acrobat')) usadosAcrobat++;
          else if (n.includes('autocad')) usadosAutocad++;
          else if (['photoshop','illustrator','indesign','premiere','after','lightroom','xd','audition','animate','dreamweaver'].some(x=>n.includes(x))) {
            usadosSingle++;
          }
        });
      }
    });

    function getUsado(nomeBalde: string){
      const nb = nomeBalde.toLowerCase();
      if (nb.includes('single') || nb.includes('225')) return usadosSingle;
      if (nb.includes('todos') || nb.includes('edicao 4')) return usadosTodos;
      if (nb.includes('acrobat')) return usadosAcrobat;
      if (nb.includes('autocad')) return usadosAutocad;
      return 0;
    }

    const detalhe = contratados.map((b:any)=>{
      const usado = getUsado(b.nome);
      return {...b, usado, livre: b.qtd_contratada - usado };
    });

    const emUso = usadosAcrobat + usadosTodos + usadosSingle + usadosAutocad;
    const livres = total - emUso;

    return { total, emUso, livres, taxa: total? Math.round(emUso/total*100):0, detalhe };
  }, [data, softwares]);

  async function handleDelete(id: string){
    if(!confirm('Excluir este balde?')) return;
    await supabase.from('usuario_softwares').delete().eq('software_id', id);
    await supabase.from('softwares').delete().eq('id', id);
    onRefresh?.();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">TOTAL CONTRATADO</p><p className="text-2xl font-bold text-white mt-2">{stats.total}</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">EM USO</p><p className="text-2xl font-bold text-emerald-400 mt-2">{stats.emUso}</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">DISPONIVEIS</p><p className="text-2xl font-bold text-sky-400 mt-2">{stats.livres}</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">TAXA DE UTILIZACAO</p><p className="text-2xl font-bold text-[#D4AF37] mt-2">{stats.taxa}%</p></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {stats.detalhe.map((b:any)=>(
          <div key={b.nome} className="bg-[#001726] border border-[#1e293b] rounded-xl p-3 relative">
            <div className="absolute top-2 right-2 flex gap-1">
              <button onClick={()=>onEditSoftware?.(b)} className="p-1.5 bg-[#0f172a] border border-[#1e293b] rounded hover:bg-[#D4AF37]/20"><Pencil className="w-3.5 h-3.5 text-[#D4AF37]" /></button>
              <button onClick={()=>handleDelete(b.id)} className="p-1.5 bg-[#0f172a] border border-[#1e293b] rounded hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            </div>
            <p className="text-[11px] text-[#94a3b8] truncate pr-12">{b.nome}</p>
            <div className="flex justify-between items-end mt-1"><p className={`text-white font-bold ${b.livre<0?'text-red-400':''}`}>{b.usado} / {b.contratado}</p><p className={`text-xs font-bold ${b.livre<0?'text-red-400':'text-sky-400'}`}>{b.livre} livres</p></div>
            <div className="w-full bg-[#00121E] h-1.5 rounded mt-2"><div className={`${b.livre<0?'bg-red-500':'bg-[#D4AF37]'} h-1.5 rounded`} style={{width: `${Math.min(100, b.contratado? b.usado/b.contratado*100:0)}%`}}></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
