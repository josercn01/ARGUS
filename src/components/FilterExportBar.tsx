import { useMemo, useState } from 'react';
import { Search, Download } from 'lucide-react';

export function FilterExportBar({ data, onFilter }: { data:any[], onFilter:(f:any[])=>void }) {
  const [setorTxt, setSetorTxt] = useState('');
  const [nomeTxt, setNomeTxt] = useState('');

  const setores = useMemo(()=> [...new Set(data.map((u:any)=>u.setor).filter(Boolean))].sort() as string[], [data]);

  const sugestoes = useMemo(()=>{
    if(!setorTxt) return [];
    return setores.filter(s=> s.toLowerCase().includes(setorTxt.toLowerCase())).slice(0,8);
  }, [setorTxt, setores]);

  const filtrados = useMemo(()=>{
    const f = data.filter((u:any)=>{
      const mSetor = setorTxt? u.setor?.toLowerCase().includes(setorTxt.toLowerCase()) : true;
      const mNome = nomeTxt? u.colaborador?.toLowerCase().includes(nomeTxt.toLowerCase()) || u.email?.toLowerCase().includes(nomeTxt.toLowerCase()) : true;
      return mSetor && mNome;
    });
    return f;
  }, [data, setorTxt, nomeTxt]);

  // envia pro pai
  useMemo(()=>{ onFilter(filtrados) }, [filtrados]);

  function exportar(){
    const header = ['Colaborador','Email','Setor','Cargo','Status','Softwares'].join(';');
    const linhas = filtrados.map((u:any)=>{
      const softs = (u.softwares||[]).map((s:any)=>s.nome).join(' | ');
      return [u.colaborador, u.email, u.setor, u.cargo, u.status, softs].map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(';');
    });
    const csv = [header,...linhas].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url;
    a.download=`ARGUS_${setorTxt||'todos'}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  return (
    <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-3 flex flex-col md:flex-row gap-3">
      <div className="flex-1 relative">
        <div className="flex items-center bg-[#00121E] border border-[#1e293b] rounded-lg px-3">
          <Search className="w-4 h-4 text-[#64748b]" />
          <input value={setorTxt} onChange={e=>setSetorTxt(e.target.value)} placeholder="Digite departamento: SECOM, DGER, SEGRAF..." className="w-full bg-transparent p-2.5 text-white text-sm outline-none" />
        </div>
        {sugestoes.length>0 && (
          <div className="absolute z-20 top-11 left-0 right-0 bg-[#00121E] border border-[#1e293b] rounded-lg">
            {sugestoes.map(s=><button key={s} onClick={()=>setSetorTxt(s)} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-[#1e293b]">{s}</button>)}
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center bg-[#00121E] border border-[#1e293b] rounded-lg px-3">
        <Search className="w-4 h-4 text-[#64748b]" />
        <input value={nomeTxt} onChange={e=>setNomeTxt(e.target.value)} placeholder="Nome ou e-mail..." className="w-full bg-transparent p-2.5 text-white text-sm outline-none" />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-[#94a3b8]">{filtrados.length}/{data.length}</span>
        <button onClick={exportar} className="bg-[#D4AF37] text-black rounded-lg px-4 py-2.5 text-xs font-bold flex gap-2"><Download className="w-4 h-4"/>Exportar{setorTxt? ` ${setorTxt}`:''}</button>
      </div>
    </div>
  );
}
