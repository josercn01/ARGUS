import { Pencil, Trash2, Box } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function MetricsCards({ data, softwares, onEditSoftware, onRefresh }: any) {

  function getUso(pool: any){
    const familia = (pool.familia || '').toUpperCase();
    const nomePool = (pool.nome || '').toLowerCase();

    // POOL SINGLE APPS - 225: conta por PESSOA, não por app
    if(familia === 'SINGLE_POOL' || nomePool.includes('pool single')){
      const pessoas = new Set<string>();
      data.forEach((u:any)=>{
        // tem algum app single? (qtd 0 + familia single)
        const temSingle = (u.softwares||[]).some((sw:any)=>{
          const real = softwares.find((s:any)=>s.id===sw.id);
          if(!real) return false;
          if((real.qtd_contratada||0)>0) return false; // é balde, ignora
          return (real.familia||'').toUpperCase()==='SINGLE_POOL';
        });
        // ou tem o pool direto antigo
        const temPoolDireto = (u.softwares||[]).some((sw:any)=>sw.id===pool.id);
        if(temSingle || temPoolDireto) pessoas.add(u.id);
      });
      return pessoas.size;
    }

    // ACROBAT - 202
    if(familia === 'ACROBAT' || nomePool.includes('acrobat')){
      let c = 0;
      data.forEach((u:any)=>{
        if((u.softwares||[]).some((sw:any)=>{
          const real = softwares.find((s:any)=>s.id===sw.id);
          return real && ((real.familia||'').toUpperCase()==='ACROBAT' || real.nome.toLowerCase().includes('acrobat'));
        })) c++;
      });
      return c;
    }

    // TODOS OS APPS - 202
    if(familia === 'ALL_APPS' || nomePool.includes('todos os apps')){
      let c = 0;
      data.forEach((u:any)=>{
        if((u.softwares||[]).some((sw:any)=>{
          const real = softwares.find((s:any)=>s.id===sw.id);
          return real && ((real.familia||'').toUpperCase()==='ALL_APPS' || real.nome.toLowerCase().includes('todos os apps'));
        })) c++;
      });
      return c;
    }

    // OUTROS como AutoCAD 0/10 - conta direto pelo id do balde
    let c = 0;
    data.forEach((u:any)=>{
      if((u.softwares||[]).some((sw:any)=>sw.id===pool.id)) c++;
    });
    return c;
  }

  async function handleDelete(id: string){
    if(!confirm('Excluir este balde?')) return;
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
        const perc = Math.min(100, Math.max(0,(uso/(s.qtd_contratada||1))*100));
        return (
          <div key={s.id} className="bg-[#001E33] border border-[#1e293b] rounded-xl p-3 relative">
            <div className="absolute top-2 right-2 flex gap-1">
              <button onClick={()=>onEditSoftware(s)} className="p-1.5 bg-[#0f172a] border border-[#1e293b] rounded hover:bg-[#D4AF37]/20"><Pencil className="w-3.5 h-3.5 text-[#D4AF37]" /></button>
              <button onClick={()=>handleDelete(s.id)} className="p-1.5 bg-[#0f172a] border border-[#1e293b] rounded hover:bg-red-500/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            </div>
            <p className="text-[11px] text-[#94a3b8] flex gap-1 items-center"><Box className="w-3 h-3"/>{s.nome}</p>
            <p className="text-white font-bold text-sm mt-1">{uso} / {s.qtd_contratada} <span className={`text-[11px] float-right ${livres<0?'text-red-400 font-bold':'text-sky-400'}`}>{livres} livres</span></p>
            <div className="w-full h-1 bg-[#00121E] rounded mt-2"><div className="h-1 rounded bg-[#D4AF37]" style={{width:`${perc}%`}} /></div>
          </div>
        );
      })}
    </div>
  );
}
