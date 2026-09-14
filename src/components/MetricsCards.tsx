import { Pencil, Trash2, Box } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function MetricsCards({ data, softwares, onEditSoftware, onRefresh }: any) {

  function getUso(pool: any){
    // SINGLE_POOL conta por PESSOA pra não ir pra 573
    if(pool.familia === 'SINGLE_POOL'){
      const set = new Set<string>();
      data.forEach((u:any)=>{
        const tem = (u.softwares||[]).some((sw:any)=>{
          const real = softwares.find((s:any)=>s.id===sw.id);
          return real?.familia === 'SINGLE_POOL' && (real?.qtd_contratada||0)===0;
        });
        if(tem) set.add(u.id);
      });
      // Se a pessoa tem o pool antigo direto, conta também
      data.forEach((u:any)=>{
        if((u.softwares||[]).some((sw:any)=>sw.id===pool.id)) set.add(u.id);
      });
      return set.size;
    }
    // Outros baldes conta atribuições
    let total = 0;
    data.forEach((u:any)=>(u.softwares||[]).forEach((sw:any)=>{
      const real = softwares.find((s:any)=>s.id===sw.id);
      if(!real) return;
      if(real.id===pool.id) total++;
      else if(pool.familia!=='OUTROS' && real.familia===pool.familia && (real.qtd_contratada||0)===0) {
         // no caso do Acrobat e Todos Apps, filho com qtd 0 não existe, mas garante
         total++;
      }
    }));
    return total;
  }

  async function handleDelete(id: string){
    if(!confirm('Excluir este balde/software? Isso remove de todos os usuários.')) return;
    await supabase.from('usuario_softwares').delete().eq('software_id', id);
    await supabase.from('softwares').delete().eq('id', id);
    onRefresh();
  }

  const pools = (softwares||[]).filter((s:any)=>(s.qtd_contratada||0)>0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      {pools.map((s:any)=>{
        const uso = getUso(s);
        const livres = (s.qtd_contratada||0) - uso;
        const perc = Math.min(100, (uso/(s.qtd_contratada||1))*100);
        return (
          <div key={s.id} className="bg-[#001E33] border border-[#1e293b] rounded-xl p-3 relative group">
            <div className="absolute top-2 right-2 flex gap-1">
              <button onClick={()=>onEditSoftware(s)} className="p-1.5 bg-[#0f172a] border border-[#1e293b] rounded hover:bg-[#D4AF37]/20"><Pencil className="w-3.5 h-3.5 text-[#D4AF37]" /></button>
              <button onClick={()=>handleDelete(s.id)} className="p-1.5 bg-[#0f172a] border border-[#1e293b] rounded hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            </div>
            <p className="text-[11px] text-[#94a3b8] flex items-center gap-1"><Box className="w-3 h-3"/>{s.nome}</p>
            <p className="text-white font-bold text-sm mt-1">{uso} / {s.qtd_contratada} <span className={`text-[11px] float-right ${livres<0?'text-red-400':'text-sky-400'}`}>{livres} livres</span></p>
            <div className="w-full h-1 bg-[#00121E] rounded mt-2"><div className="h-1 rounded bg-[#D4AF37]" style={{width:`${perc}%`}} /></div>
          </div>
        );
      })}
    </div>
  );
}
