import { useMemo } from 'react';

export function MetricsCards({ data, softwares }: any) {
  const stats = useMemo(() => {
    const contratados = softwares.filter((s:any)=>s.qtd_contratada>0);
    const total = contratados.reduce((a:any,b:any)=>a+b.qtd_contratada,0);

    let usadosAcrobat = 0;
    let usadosTodos = 0;
    let usadosSingle = 0;
    let usadosAutocad = 0;

    data.forEach((u:any)=>{
      const softs = (u.softwares||[]).map((s:any)=>s.nome.toLowerCase());
      const hasTodos = softs.some((n:string)=> n.includes('todos') || n.includes('all apps') || n.includes('creative cloud') && n.includes('todos') );
      // Creative Cloud - Todos os Apps entra como Todos
      const isTodosUser = hasTodos || softs.some((n:string)=> n.includes('todos os apps - edicao'));

      if (isTodosUser) {
        usadosTodos += 1; // 1 usuário de Todos = 1 licença Todos
      } else {
        // Só conta Single se NÃO tem Todos
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
      return { nome: b.nome, contratado: b.qtd_contratada, usado, livre: b.qtd_contratada - usado };
    });

    const emUso = usadosAcrobat + usadosTodos + usadosSingle + usadosAutocad;
    const livres = total - emUso;

    return { total, emUso, livres, taxa: total? Math.round(emUso/total*100):0, detalhe };
  }, [data, softwares]);

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
          <div key={b.nome} className="bg-[#001726] border border-[#1e293b] rounded-xl p-3">
            <p className="text-[11px] text-[#94a3b8] truncate">{b.nome}</p>
            <div className="flex justify-between items-end mt-1"><p className={`text-white font-bold ${b.livre<0?'text-red-400':''}`}>{b.usado} / {b.contratado}</p><p className={`text-xs font-bold ${b.livre<0?'text-red-400':'text-sky-400'}`}>{b.livre} livres</p></div>
            <div className="w-full bg-[#00121E] h-1.5 rounded mt-2"><div className={`${b.livre<0?'bg-red-500':'bg-[#D4AF37]'} h-1.5 rounded`} style={{width: `${Math.min(100, b.contratado? b.usado/b.contratado*100:0)}%`}}></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
