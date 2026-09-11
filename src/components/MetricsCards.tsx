import { Pencil, Trash2, Box } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function MetricsCards({ softwares, data, onEditSoftware, onRefresh }: any) {
  //... seu calculo de uso existente, mantém
  const getUso = (s:any) => data.filter((u:any)=> u.softwares?.some((sw:any)=>(sw.id||sw.software_id)===s.id)).length;

  async function handleDelete(id:string){
    if(!confirm('Excluir este software? Remove de todos os usuários.')) return;
    await supabase.from('usuario_softwares').delete().eq('software_id', id);
    await supabase.from('softwares').delete().eq('id', id);
    onRefresh();
  }

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {softwares.map((s:any)=>{
        const uso = getUso(s);
        const livres = (s.qtd_contratada||0) - uso;
        return (
          <div key={s.id} className="bg-[#001E33] border border-[#1e293b] rounded-xl p-3 relative group">
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button onClick={()=>onEditSoftware(s)} className="p-1.5 bg-[#1e293b] rounded hover:bg-[#D4AF37]/20"><Pencil className="w-3 h-3 text-[#D4AF37]" /></button>
              <button onClick={()=>handleDelete(s.id)} className="p-1.5 bg-[#1e293b] rounded hover:bg-red-500/20"><Trash2 className="w-3 h-3 text-red-400" /></button>
            </div>
            <p className="text-[11px] text-[#94a3b8] flex gap-1"><Box className="w-3 h-3" />{s.nome}</p>
            <p className="text-white font-bold text-sm mt-1">{uso} / {s.qtd_contratada} <span className="text-[11px] text-sky-400 font-normal float-right">{livres} livres</span></p>
            <div className="w-full h-1 bg-[#00121E] rounded mt-2"><div className="h-1 bg-[#D4AF37] rounded" style={{width: `${Math.min(100, (uso/(s.qtd_contratada||1))*100)}%`}} /></div>
          </div>
        );
      })}
    </div>
  );
}
