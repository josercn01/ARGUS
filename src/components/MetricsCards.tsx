import { useMemo, useState, useRef } from 'react';
import { Pencil, Trash2, Upload, Download, X, Trash, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function MetricsCards({ data, softwares, onEditSoftware, onRefresh }: any) {
  const [showImport, setShowImport] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle'|'parsing'|'importing'|'success'|'error'|'deleting'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [adicionados, setAdicionados] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const contratados = softwares.filter((s:any)=>s.qtd_contratada>0);
    const totalGeral = contratados.reduce((a:any,b:any)=>a+b.qtd_contratada,0);
    const totalAdobe = contratados.filter((s:any)=>!s.nome.toLowerCase().includes('autocad')).reduce((a:any,b:any)=>a+b.qtd_contratada,0);

    let usadosAcrobat = 0, usadosTodos = 0, usadosSingle = 0, usadosAutocad = 0;
    const SINGLE_KEYWORDS = ['photoshop','illustrator','indesign','premiere','after effects','after','lightroom','xd','audition','animate','dreamweaver','incopy'];

    data.forEach((u:any)=>{
      let entries = [...(u.tipo_produto||'').toLowerCase().split('|'),...(u.produto||'').toLowerCase().split('|'),...(u.softwares||[]).map((s:any)=>s.nome.toLowerCase())].map(e=>e.trim()).filter(Boolean);
      entries = Array.from(new Set(entries));
      const hasTodos = entries.some(e=> e.includes('todos') || e.includes('all apps') || e.includes('edicao 4') || e.includes('edição 4'));
      if(hasTodos){ usadosTodos += 1; return; }
      const hasSpecific = entries.some(e=> SINGLE_KEYWORDS.some(k=>e.includes(k)));
      if(hasSpecific) entries = entries.filter(e=> e!== 'aplicativo individual' && e!== 'single');
      let ac=0, au=0, si=0;
      entries.forEach(e=>{
        if(e.includes('acrobat')) ac+=1;
        else if(e.includes('autocad')) au+=1;
        else if(e.includes('aplicativo individual') || SINGLE_KEYWORDS.some(k=>e.includes(k))) si+=1;
      });
      usadosAcrobat += Math.min(ac,1);
      usadosAutocad += Math.min(au,1);
      usadosSingle += si;
    });

    function getUsado(nome: string){
      const n = nome.toLowerCase();
      if(n.includes('single')||n.includes('225')) return usadosSingle;
      if(n.includes('todos')||n.includes('edicao')) return usadosTodos;
      if(n.includes('acrobat')) return usadosAcrobat;
      if(n.includes('autocad')) return usadosAutocad;
      return 0;
    }
    const detalhe = contratados.map((b:any)=>({...b, usado:getUsado(b.nome), livre:b.qtd_contratada-getUsado(b.nome)}));
    const emUso = usadosAcrobat + usadosTodos + usadosSingle + usadosAutocad;
    const emUsoAdobe = usadosAcrobat + usadosTodos + usadosSingle;

 
    return { totalGeral, totalAdobe, emUso, emUsoAdobe, livres: totalGeral-emUso, livresAdobe: totalAdobe-emUsoAdobe, taxa: totalAdobe? Math.round(emUsoAdobe/totalAdobe*100):0, detalhe, diff, consoleAdobe, raw:{usadosAcrobat,usadosTodos,usadosSingle} };
  }, [data, softwares]);

  async function handleDelete(id: string){
    if(!confirm('Excluir este balde?')) return;
    await supabase.from('usuario_softwares').delete().eq('software_id', id);
    await supabase.from('softwares').delete().eq('id', id);
    onRefresh?.();
  }

  async function handleDeleteAll(){
    if(!confirm(`Apagar TODOS os ${data.length} usuários?`)) return;
    if(prompt('Digite EXCLUIR')!== 'EXCLUIR') return;
    setShowImport(true); setStatus('deleting'); setProgress(10); setLogs([`Apagando ${data.length}...`]);
    await supabase.from('usuario_softwares').delete().neq('usuario_id','00000000-0000-0000-0000-000000000000');
    await supabase.from('usuarios').delete().neq('id','00000000-0000-0000-0000-000000000000');
    setProgress(100); setStatus('success'); onRefresh?.(); setTimeout(()=>setShowImport(false),800);
  }

  function handleDownloadAjuste(){
    const csv = `Acao;Licença;Quantidade;Observacao
ADICIONAR;Acrobat Pro DC;1;Falta 1 para bater 200 da Console
ADICIONAR;Aplicativo Individual;4;Falta 4 para bater 185 da Console
REMOVER;Todos os Apps - Edicao 4;1;Sobra 1 no site (193 vs 192)
ORIGEM;Site Atual; ;Acrobat=${stats.raw.usadosAcrobat} Single=${stats.raw.usadosSingle} Todos=${stats.raw.usadosTodos} TotalAdobe=${stats.emUsoAdobe}
DESTINO;Adobe Console; ;Acrobat=200 Single=185 Todos=192 Total=577
`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='ajuste_reconciliacao_adobe_console.csv'; a.click();
  }

  function handleDownloadModelo(){
    const modelo = `Email;NomeCompleto;Departamento;Cargo;Produto;Tipo de produto
exemplo.acrobat@senado.leg.br;Usuario Faltante Acrobat;SECOM;Analista;Acrobat Pro DC;Acrobat Pro DC
exemplo.single1@senado.leg.br;Usuario Faltante Single 1;SECOM;Analista;Aplicativo Individual;Photoshop
exemplo.single2@senado.leg.br;Usuario Faltante Single 2;SECOM;Analista;Aplicativo Individual;Illustrator
`;
    const blob = new Blob([modelo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='modelo_ajuste_5_licencas.csv'; a.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0]; if(!file) return;
    setShowImport(true); setStatus('parsing'); setProgress(5); setLogs([`Arquivo: ${file.name}`]);
    const text = await file.text(); const lines = text.split(/\r?\n/).filter(l=>l.trim());
    const header = lines[0].split(';').map(h=>h.trim());
    const idxEmail = header.indexOf('Email'), idxNome = header.indexOf('NomeCompleto'), idxDepto = header.indexOf('Departamento'), idxCargo = header.indexOf('Cargo'), idxProd = header.indexOf('Produto'), idxTipo = header.indexOf('Tipo de produto');
    const emailsExistentes = new Set((data||[]).map((u:any)=>(u.email||'').toLowerCase().trim()));
    const novosMap = new Map<string, any>();
    for(let i=1;i<lines.length;i++){
      const cols = lines[i].split(';'); if(cols.length<6) continue;
      const emailLow = cols[idxEmail]?.trim().toLowerCase(); if(!emailLow || emailsExistentes.has(emailLow) || novosMap.has(emailLow)) continue;
      novosMap.set(emailLow, { email_original: cols[idxEmail].trim(), nome: cols[idxNome].trim(), depto: cols[idxDepto].trim(), cargo: cols[idxCargo].trim(), produto: cols[idxProd].trim(), tipo: cols[idxTipo].trim() });
    }
    const listaNovos = Array.from(novosMap.values());
    setProgress(30); setLogs(prev=>[...prev, `${listaNovos.length} NOVOS`]);
    if(listaNovos.length===0){ setProgress(100); setStatus('success'); return; }
    setStatus('importing');
    try{
      const { data: todosSofts } = await supabase.from('softwares').select('id,nome');
      const softMap = new Map<string, string>(); (todosSofts||[]).forEach((s:any)=> softMap.set(s.nome.toLowerCase(), s.id));
      const findSoftId = (t:string)=>{ const tl=t.toLowerCase(); for(const [n,id] of softMap.entries()) if(tl.includes(n) || n.includes(tl)) return id; return null; };
      const payload = listaNovos.map(r=>({ email: r.email_original, login: r.email_original.split('@')[0].toLowerCase(), colaborador: r.nome, nome: r.nome, nome_completo: r.nome, departamento: r.depto, setor: r.depto, cargo: r.cargo, produto: r.produto, tipo_produto: r.tipo, status: 'ativo' }));
      let insertedIds: any[] = [];
      for(let i=0;i<payload.length;i+=100){
        const { data: inserted, error } = await supabase.from('usuarios').upsert(payload.slice(i,i+100), { onConflict: 'email' }).select('id,email');
        if(error) throw error; if(inserted) insertedIds.push(...inserted);
      }
      const emailToId = new Map(insertedIds.map((u:any)=>[u.email.toLowerCase(), u.id]));
      if(emailToId.size < listaNovos.length){
        const { data: buscados } = await supabase.from('usuarios').select('id,email').in('email', listaNovos.map(r=>r.email_original));
        buscados?.forEach((u:any)=> emailToId.set(u.email.toLowerCase(), u.id));
      }
      const vinculos: any[] = [];
      listaNovos.forEach(r=>{
        const uid = emailToId.get(r.email_original.toLowerCase()); if(!uid) return;
        r.tipo.split('|').map((t:string)=>t.trim()).filter(Boolean).forEach((t:string)=>{ const sid=findSoftId(t); if(sid) vinculos.push({ usuario_id: uid, software_id: sid }); });
      });
      for(let i=0;i<vinculos.length;i+=200){ await supabase.from('usuario_softwares').upsert(vinculos.slice(i,i+200), { onConflict: 'usuario_id,software_id' }); }
      setAdicionados(listaNovos); setProgress(100); setStatus('success'); setLogs(prev=>[...prev, `✓ ${listaNovos.length} adicionados`]); onRefresh?.();
    }catch(err:any){ setStatus('error'); setLogs(prev=>[...prev,`ERRO: ${err.message}`]); }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button onClick={()=>fileRef.current?.click()} className="flex items-center gap-2 bg-[#D4AF37] text-black text-xs font-bold px-4 py-2 rounded-lg"><Upload className="w-4 h-4"/> Importar</button>
          <button onClick={handleDownloadModelo} className="flex items-center gap-2 bg-[#0f172a] border border-[#1e293b] text-white text-xs font-bold px-4 py-2 rounded-lg"><Download className="w-4 h-4"/> Modelo</button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange}/>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-[#64748b]">{data.length} usuários | {stats.emUso} licenças ( {stats.emUsoAdobe} Adobe )</p>
          <button onClick={handleDeleteAll} className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-3 py-2 rounded-lg"><Trash className="w-4 h-4"/> Apagar todos</button>
        </div>
      </div>

      {/* PAINEL DE RECONCILIACAO */}
      {(stats.diff.acrobat!==0 || stats.diff.single!==0 || stats.diff.todos!==0) && (
        <div className="bg-[#1a0f00] border border-amber-500/30 rounded-xl p-4 flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-amber-400 text-xs font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Divergência com Adobe Admin Console detectada</p>
            <div className="text-[11px] text-[#cbd5e1] font-mono">
              <div>Acrobat: Console {stats.consoleAdobe.acrobat} vs Site {stats.raw.usadosAcrobat} → <span className={stats.diff.acrobat>0?'text-emerald-400':'text-red-400'}>{stats.diff.acrobat>0?`+${stats.diff.acrobat}`:stats.diff.acrobat} {stats.diff.acrobat>0?'Adicionar':'Remover'}</span></div>
              <div>Single: Console {stats.consoleAdobe.single} vs Site {stats.raw.usadosSingle} → <span className={stats.diff.single>0?'text-emerald-400':'text-red-400'}>{stats.diff.single>0?`+${stats.diff.single}`:stats.diff.single} {stats.diff.single>0?'Adicionar':'Remover'}</span></div>
              <div>Todos: Console {stats.consoleAdobe.todos} vs Site {stats.raw.usadosTodos} → <span className={stats.diff.todos>0?'text-emerald-400':'text-red-400'}>{stats.diff.todos>0?`+${stats.diff.todos}`:stats.diff.todos} {stats.diff.todos>0?'Adicionar':'Remover'}</span></div>
              <div className="pt-1 font-bold">Total Adobe: {stats.emUsoAdobe} / {stats.consoleAdobe.total} (dif {stats.diff.total}) | Total Geral c/ AutoCAD: {stats.totalGeral}</div>
            </div>
          </div>
          <button onClick={handleDownloadAjuste} className="bg-amber-500 text-black text-xs font-bold px-3 py-2 rounded-lg">Baixar CSV de Ajuste</button>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#001E33] border border-[#1e293b] rounded-xl w-full max-w-[550px] p-5">
            <div className="flex justify-between mb-4"><h3 className="text-white font-bold">{status==='success'?`Concluído +${adicionados.length}`:'Importando...'}</h3><button onClick={()=>setShowImport(false)}><X className="w-5 h-5 text-white"/></button></div>
            <div className="w-full bg-[#00121E] h-2 rounded-full overflow-hidden mb-3"><div className="h-2 rounded bg-[#D4AF37]" style={{width:`${progress}%`}}></div></div>
            <div className="bg-[#00121E] border rounded p-3 max-h-32 overflow-auto text-[11px] font-mono text-[#cbd5e1] space-y-1">{logs.map((l,i)=><div key={i}>{l}</div>)}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">TOTAL ADOBE (s/ AutoCAD)</p><p className="text-2xl font-bold text-white mt-2">{stats.totalAdobe}</p><p className="text-[10px] text-[#64748b]">{stats.totalGeral} c/ AutoCAD</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">EM USO ADOBE</p><p className="text-2xl font-bold text-emerald-400 mt-2">{stats.emUsoAdobe}</p><p className="text-[10px] text-[#64748b]">{stats.emUso} c/ AutoCAD - Console {stats.consoleAdobe.total}</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">DISPONIVEIS ADOBE</p><p className="text-2xl font-bold text-sky-400 mt-2">{stats.livresAdobe}</p><p className="text-[10px] text-[#64748b]">{stats.livres} geral</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">TAXA ADOBE</p><p className="text-2xl font-bold text-[#D4AF37] mt-2">{stats.taxa}%</p></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.detalhe.map((b:any)=>(
          <div key={b.id} className="bg-[#001726] border border-[#1e293b] rounded-xl p-3 relative">
            <div className="absolute top-2 right-2 flex gap-1">
              <button onClick={()=>onEditSoftware?.(b)} className="p-1.5 bg-[#0f172a] border rounded"><Pencil className="w-3.5 h-3.5 text-[#D4AF37]"/></button>
              <button onClick={()=>handleDelete(b.id)} className="p-1.5 bg-[#0f172a] border rounded"><Trash2 className="w-3.5 h-3.5 text-red-400"/></button>
            </div>
            <p className="text-[11px] text-[#94a3b8] truncate pr-12">{b.nome}</p>
            <div className="flex justify-between items-end mt-1"><p className="text-white font-bold">{b.usado} / {b.qtd_contratada}</p><p className={`text-xs font-bold ${b.livre<0?'text-red-400':'text-sky-400'}`}>{b.livre} livres</p></div>
            <div className="w-full bg-[#00121E] h-1.5 rounded mt-2"><div className={`${b.livre<0?'bg-red-500':'bg-[#D4AF37]'} h-1.5 rounded`} style={{width:`${Math.min(100, b.qtd_contratada? b.usado/b.qtd_contratada*100:0)}%`}}></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}
