import { useMemo } from 'react';

export function MetricsCards({ data, softwares }: any) {
  const stats = useMemo(() => {
    const contratados = softwares.filter((s:any)=>s.qtd_contratada>0);
    const total = contratados.reduce((a:any,b:any)=>a+b.qtd_contratada,0);

    // conta uso real
    const count = new Map<string, number>();
    let emUsoTotal = 0;

    data.forEach((u:any)=>{
      (u.softwares||[]).forEach((s:any)=>{
        emUsoTotal++;
        const nome = s.nome.toLowerCase();
        count.set(nome, (count.get(nome)||0)+1);
        // conta também pelo nome exato
        count.set(s.nome, (count.get(s.nome)||0)+1);
      });
    });

    function calculaUsado(balde:any){
      const nomeBalde = balde.nome.toLowerCase();
      if (nomeBalde.includes('single') || nomeBalde.includes('225')) {
        // Pool: Photoshop, Illustrator, InDesign, Lightroom, Premiere, After Effects, etc
        let c = 0;
        count.forEach((v,k)=>{
          if (typeof k === 'string' && k.toLowerCase) {
            const kl = k.toLowerCase();
            if (['photoshop','illustrator','indesign','premiere','after effects','lightroom','xd','audition','dreamweaver','animate'].some(x=>kl.includes(x))) {
              c+=v;
            }
          }
        });
        // Evita contar duplicado (usamos só chaves lowercase)
        const usadosLower = new Set<string>();
        let totalSingle = 0;
        count.forEach((v,k)=>{
          if(typeof k!=='string') return;
          if(k!==k.toLowerCase()) return;
          if(['photoshop','illustrator','indesign','premiere','after effects','lightroom'].some(x=>k.includes(x))){
            if(!usadosLower.has(k)){ totalSingle+=v; usadosLower.add(k); }
          }
        });
        return totalSingle;
      }
      if (nomeBalde.includes('todos os apps') || nomeBalde.includes('edicao 4')) {
        let c = 0;
        count.forEach((v,k)=>{
          if(typeof k!=='string' || k!==k.toLowerCase()) return;
          if(k.includes('todos') || k.includes('all apps') || k.includes('creative cloud')) c+=v;
        });
        return c;
      }
      if (nomeBalde.includes('acrobat')) {
        let c = 0;
        count.forEach((v,k)=>{
          if(typeof k!=='string' || k!==k.toLowerCase()) return;
          if(k.includes('acrobat')) c+=v;
        });
        return c;
      }
      if (nomeBalde.includes('autocad')) {
        return count.get('autocad') || count.get('AutoCAD') || 0;
      }
      return count.get(balde.nome) || count.get(balde.nome.toLowerCase()) || 0;
    }

    const detalhe = contratados.map((b:any)=>{
      const usado = calculaUsado(b);
      return { nome: b.nome, contratado: b.qtd_contratada, usado, livre: b.qtd_contratada - usado };
    });

    const emUso = detalhe.reduce((a:any,c:any)=>a+c.usado,0);
    const livres = total - emUso;

    return { total, emUso: emUsoTotal>0? emUsoTotal : emUso, livres, taxa: total? Math.round((emUsoTotal>0?emUsoTotal:emUso)/total*100):0, detalhe };
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
            <div className="flex justify-between items-end mt-1"><p className="text-white font-bold">{b.usado} / {b.contratado}</p><p className="text-xs font-bold text-sky-400">{b.livre} livres</p></div>
            <div className="w-full bg-[#00121E] h-1.5 rounded mt-2"><div className="bg-[#D4AF37] h-1.5 rounded" style={{width: `${Math.min(100, b.contratado? b.usado/b.contratado*100:0)}%`}}></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
