import { useMemo, useState, useRef } from 'react';
import { Pencil, Trash2, Upload, Download, X, CheckCircle, AlertCircle, Trash } from 'lucide-react';
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
    const total = contratados.reduce((a:any,b:any)=>a+b.qtd_contratada,0);
    let usadosAcrobat = 0, usadosTodos = 0, usadosSingle = 0, usadosAutocad = 0;
    data.forEach((u:any)=>{
      const softs = (u.softwares||[]).map((s:any)=>s.nome.toLowerCase());
      const isTodos = softs.some((n:string)=> n.includes('todos') || n.includes('all apps') || n.includes('edicao 4'));
      if (isTodos) { usadosTodos += 1; return; }
      let temAcrobat = false, temAutocad = false, temSingle = false;
      softs.forEach((n:string)=>{
        if (n.includes('acrobat')) temAcrobat = true;
        else if (n.includes('autocad')) temAutocad = true;
        else if (['photoshop','illustrator','indesign','premiere','after','lightroom','xd','audition','animate','dreamweaver','single'].some(x=>n.includes(x))) temSingle = true;
      });
      if(temAcrobat) usadosAcrobat++; if(temAutocad) usadosAutocad++; if(temSingle) usadosSingle++;
    });
    function getUsado(nb: string){
      const n = nb.toLowerCase();
      if (n.includes('single') || n.includes('225')) return usadosSingle;
      if (n.includes('todos') || n.includes('edicao 4')) return usadosTodos;
      if (n.includes('acrobat')) return usadosAcrobat;
      if (n.includes('autocad')) return usadosAutocad;
      return 0;
    }
    const detalhe = contratados.map((b:any)=>({...b, usado: getUsado(b.nome), livre: b.qtd_contratada - getUsado(b.nome)}));
    const emUso = usadosAcrobat + usadosTodos + usadosSingle + usadosAutocad;
    return { total, emUso, livres: total-emUso, taxa: total? Math.round(emUso/total*100):0, detalhe };
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

  function handleDownloadModelo(){
    const modelo = `Email;NomeCompleto;Departamento;Cargo;Produto;Tipo de produto
abelardo.mendes@senado.leg.br;Abelardo Antonio Mendes Junior;SF-OSE-DGER-SEGRAF-COEDIT-SEMID;Efetivo - Chefe De Serviço;Todos os Apps;Todos os Apps
`;
    const blob = new Blob([modelo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='modelo_argus_importacao.csv'; a.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0]; if(!file) return;
    setShowImport(true); setStatus('parsing'); setProgress(5);
    setLogs([`Arquivo: ${file.name} (${(file.size/1024).toFixed(1)} KB)`]); setAdicionados([]);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l=>l.trim());
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
    setProgress(30); setLogs(prev=>[...prev, `${lines.length-1} linhas`, `${listaNovos.length} NOVOS`]);
    if(listaNovos.length===0){ setProgress(100); setStatus('success'); return; }
    setStatus('importing');
    try{
      const { data: todosSofts } = await supabase.from('softwares').select('id,nome');
      const softMap = new Map<string, string>(); (todosSofts||[]).forEach((s:any)=> softMap.set(s.nome.toLowerCase(), s.id));
      const findSoftId = (t:string)=>{ const tl=t.toLowerCase(); for(const [n,id] of softMap.entries()) if(tl.includes(n) || n.includes(tl)) return id; return null; };

      // PAYLOAD EXATO PARA SUA TABELA (colaborador + login são NOT NULL)
      const payload = listaNovos.map(r=>{
        const login = r.email_original.split('@')[0].toLowerCase(); // ex: abelardo.mendes
        return {
          email: r.email_original,
          login: login,
          colaborador: r.nome, // NOT NULL
          nome: r.nome,
          nome_completo: r.nome,
          departamento: r.depto,
          setor: r.depto,
          cargo: r.cargo,
          produto: r.produto,
          tipo_produto: r.tipo,
          status: 'ativo'
        };
      });

      let insertedIds: any[] = [];
      setLogs(prev=>[...prev,`Inserindo ${payload.length} com login + colaborador...`]);
      for(let i=0;i<payload.length;i+=100){
        const chunk = payload.slice(i,i+100);
        const { data: inserted, error } = await supabase.from('usuarios').upsert(chunk, { onConflict: 'email' }).select('id,email');
        if(error) throw error;
        if(inserted) insertedIds.push(...inserted);
        setProgress(50 + Math.round(((i+chunk.length)/payload.length)*30));
      }

      setProgress(85); setLogs(prev=>[...prev,'Vinculando licenças...']);
      const emailToId = new Map(insertedIds.map((u:any)=>[u.email.toLowerCase(), u.id]));
      // busca faltantes se upsert não retornou tudo
      if(emailToId.size < listaNovos.length){
        const { data: buscados } = await supabase.from('usuarios').select('id,email').in('email', listaNovos.map(r=>r.email_original));
        buscados?.forEach((u:any)=> emailToId.set(u.email.toLowerCase(), u.id));
      }

      const vinculos: any[] = [];
      listaNovos.forEach(r=>{
        const uid = emailToId.get(r.email_original.toLowerCase()); if(!uid) return;
        r.tipo.split('|').map((t:string)=>t.trim()).filter(Boolean).forEach((t:string)=>{ const sid=findSoftId(t); if(sid) vinculos.push({ usuario_id: uid, software_id: sid }); });
      });
      for(let i=0;i<vinculos.length;i+=200){
        await supabase.from('usuario_softwares').upsert(vinculos.slice(i,i+200), { onConflict: 'usuario_id,software_id' });
      }

      setAdicionados(listaNovos); setProgress(100); setStatus('success');
      setLogs(prev=>[...prev, `✓ ${listaNovos.length} adicionados`, `+ ${vinculos.length} vínculos`]);
      onRefresh?.();
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
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-[#64748b]">{data.length} usuários</span>
          <button onClick={handleDeleteAll} className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-3 py-2 rounded-lg"><Trash className="w-4 h-4"/> Apagar todos</button>
        </div>
      </div>
      {showImport && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#001E33] border border-[#1e293b] rounded-xl w-full max-w-[550px] p-5">
            <div className="flex justify-between mb-4"><h3 className="text-white font-bold">{status==='success'?`Concluído +${adicionados.length}`:status==='deleting'?'Apagando...':'Importando...'}</h3><button onClick={()=>setShowImport(false)}><X className="w-5 h-5 text-white"/></button></div>
            <div className="w-full bg-[#00121E] h-2 rounded-full overflow-hidden mb-3"><div className={`h-2 rounded-full ${status==='error'?'bg-red-500':'bg-[#D4AF37]'}`} style={{width:`${progress}%`}}></div></div>
            <div className="bg-[#00121E] border border-[#1e293b] rounded p-3 max-h-32 overflow-auto text-[11px] font-mono text-[#cbd5e1] space-y-1">{logs.map((l,i)=><div key={i}>{l}</div>)}</div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">TOTAL CONTRATADO</p><p className="text-2xl font-bold text-white mt-2">{stats.total}</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">EM USO</p><p className="text-2xl font-bold text-emerald-400 mt-2">{stats.emUso}</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">DISPONIVEIS</p><p className="text-2xl font-bold text-sky-400 mt-2">{stats.livres}</p></div>
        <div className="bg-[#001E33] border border-[#1e293b] rounded-xl p-4"><p className="text-xs text-[#94a3b8]">TAXA</p><p className="text-2xl font-bold text-[#D4AF37] mt-2">{stats.taxa}%</p></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {stats.detalhe.map((b:any)=>(
          <div key={b.id} className="bg-[#001726] border border-[#1e293b] rounded-xl p-3 relative">
            <div className="absolute top-2 right-2 flex gap-1">
              <button onClick={()=>onEditSoftware?.(b)} className="p-1.5 bg-[#0f172a] border border-[#1e293b] rounded"><Pencil className="w-3.5 h-3.5 text-[#D4AF37]"/></button>
              <button onClick={()=>handleDelete(b.id)} className="p-1.5 bg-[#0f172a] border border-[#1e293b] rounded"><Trash2 className="w-3.5 h-3.5 text-red-400"/></button>
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
