import { useMemo } from 'react';
import type { UsuarioLicenca, Software } from '@/types';

export function MetricsCards({ data, softwares }: { data: UsuarioLicenca[], softwares: Software[] }) {
  const stats = useMemo(() => {
    // Total contratado só de quem é BALDE (qtd > 0)
    const total = softwares.filter(s=>s.qtd_contratada>0).reduce((acc,s)=>acc+s.qtd_contratada,0);

    // Conta por vínculo, não por pessoa - LUCAS com 2 = conta 2
    const countBySoftware = new Map<string, number>();
    data.forEach(u => {
      (u.softwares || []).forEach(s => {
        countBySoftware.set(s.nome, (countBySoftware.get(s.nome) || 0) + 1);
      });
      // compat: se ainda vier no modelo antigo
      if ((!u.softwares || u.softwares.length===0) && (u as any).software) {
        const nome = (u as any).software.nome;
        countBySoftware.set(nome, (countBySoftware.get(nome) || 0) + 1);
      }
    });

    // Em uso total de atribuições
    const emUso = Array.from(countBySoftware.values()).reduce((a,b)=>a+b, 0) || data.length;

    const livres = total - emUso;
    const taxa = total>0? Math.round(emUso/total*100) : 0;

    // Detalhe por balde para você ver o consumo real
    const detalhe = softwares.filter(s=>s.qtd_contratada>0).map(balde => {
      // Se o balde é o Pool de 225, ele consome todos os SINGLE
      let usado = 0;
      if (balde.tipo_adobe==='SINGLE' || balde.familia==='SINGLE_POOL') {
        softwares.filter(s=>s.qtd_contratada===0 && (s.is_adobe) && (s.tipo_adobe==='SINGLE' || s.familia==='SINGLE_POOL')).forEach(s => {
          usado += countBySoftware.get(s.nome) || 0;
        });
      } else {
        usado = countBySoftware.get(balde.nome) || 0;
        // Acrobat Pro DC (202) pode ter sido cadastrado como Acrobat
        if (balde.nome.includes('Acrobat')) {
          usado += countBySoftware.get('Acrobat') || 0;
          usado += countBySoftware.get('Acrobat Pro DC') || 0;
        }
      }
      return { nome: balde.nome, contratado: balde.qtd_contratada, usado, livre: balde.qtd_contratada - usado };
    });

    const photoshop = countBySoftware.get('Photoshop') || 0;
    const illustrator = countBySoftware.get('Illustrator') || 0;
    const acrobat = (countBySoftware.get('Acrobat Pro DC (202)') || 0) + (countBySoftware.get('Acrobat Pro DC') || 0) + (countBySoftware.get('Acrobat') || 0);
    const todosApps = countBySoftware.get('Todos os Apps - Edicao 4 (202)') || 0;

    return { total, emUso, livres, taxa, detalhe, photoshop, illustrator, acrobat, todosApps, countBySoftware };
  }, [data, softwares]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">TOTAL CONTRATADO</p><p className="text-2xl font-bold text-white mt-2">{stats.total}</p><p className="text-[11px] text-[#64748b] mt-1">{softwares.filter(s=>s.qtd_contratada>0).map(s=>s.qtd_contratada).join(' + ')} = 225+202+202</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">EM USO (ATRIBUICOES)</p><p className="text-2xl font-bold text-emerald-400 mt-2">{stats.emUso}</p><p className="text-[11px] text-[#64748b] mt-1">Se LUCAS tem 2, conta 2</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">DISPONIVEIS (LIVRE)</p><p className="text-2xl font-bold text-sky-400 mt-2">{stats.livres}</p><p className="text-[11px] text-[#64748b] mt-1">Contratado - em uso</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">TAXA DE UTILIZACAO</p><p className="text-2xl font-bold text-[#D4AF37] mt-2">{stats.taxa}%</p><p className="text-[11px] text-[#64748b] mt-1">Photoshop {stats.photoshop} | Acrobat {stats.acrobat}</p></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.detalhe.map(b => (
          <div key={b.nome} className="bg-[#001726] border border-[#1e293b] rounded-xl p-3">
            <p className="text-[11px] text-[#94a3b8] truncate">{b.nome}</p>
            <div className="flex justify-between items-end mt-1">
              <p className="text-white font-bold">{b.usado} / {b.contratado}</p>
              <p className={`text-xs font-bold ${b.livre<10? 'text-red-400' : 'text-sky-400'}`}>{b.livre} livres</p>
            </div>
            <div className="w-full bg-[#001E33] h-1.5 rounded mt-2"><div className="bg-[#D4AF37] h-1.5 rounded" style={{width: `${Math.min(100, b.contratado? b.usado/b.contratado*100 : 0)}%`}}></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
