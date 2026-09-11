import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Plus, Loader2, Pencil, Trash2, X, Save } from 'lucide-react';

export function LicencasTable({ data, softwares, loading, onRefresh }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current:0, total:0, step:'', percent:0, eta:'' });
  const [editing, setEditing] = useState<any>(null);

  function formatETA(c:number,t:number,s:number){ if(c<3) return '...'; const el=(Date.now()-s)/1000; const per=el/c; const rem=(t-c)*per; return rem<60? `${Math.ceil(rem)}s` : `${Math.floor(rem/60)}m`; }

  async function handleFile(e:any){
    const file=e.target.files?.[0]; if(!file) return;
    setImporting(true); const start=Date.now();
    try{
      let text=await file.text(); text=text.replace(/^\uFEFF/,'');
      const lines=text.split(/\r?\n/).filter((l:any)=>l.trim()!=='');
      const total=lines.length-1; const headers=lines[0].split(';').map((h:any)=>h.trim());
      const swMap=new Map(); softwares.forEach((s:any)=> swMap.set(s.nome.toLowerCase(), s.id));
      for(let i=1;i<lines.length;i++){
        const cols=lines[i].split(';'); const row:any={}; headers.forEach((h:string,idx:number)=> row[h]=(cols[idx]||'').trim().replace(/^"|"$/g,''));
        const email=row['Email']||''; const nome=row['NomeCompleto']||email; const depto=row['Departamento']||''; const cargo=row['Cargo']||''; const tipo=row['Tipo de produto']||'';
        if(!email) continue;
        setProgress({ current:i,total, step:`${nome} → ${tipo}`, percent:Math.round(i/total*100), eta:formatETA(i,total,start) });
        const softs=tipo.split('|').map((s:string)=>s.trim()).filter(Boolean);
        const login=email.split('@')[0].toLowerCase();
        const {data:userRow}=await supabase.from('usuarios').upsert({ colaborador:nome,email,login,setor:depto,cargo,status:'ativo'},{onConflict:'login'}).select('id').single();
        if(!userRow) continue;
        for(const n of softs){ let swId=swMap.get(n.toLowerCase()); if(!swId){ const {data:novo}=await supabase.from('softwares').insert({nome:n,is_adobe:true,qtd_contratada:0}).select('id').single(); if(novo){ swId=novo.id; swMap.set(n.toLowerCase(),novo.id);} } if(swId) await supabase.from('usuario_softwares').upsert({usuario_id:userRow.id,software_id:swId},{onConflict:'usuario_id,software_id'}); }
      }
      await onRefresh();
    }catch(err:any){ alert(err.message)} finally{ setImporting(false); if(fileRef.current) fileRef.current.value=''; e.target.value=''; }
  }

  async function handleDelete(id:string){
    if(!confirm('Excluir este colaborador e todas as licenças dele?')) return;
    await supabase.from('usuario_softwares').delete().eq('usuario_id',id);
    await supabase.from('usuarios').delete().eq('id',id);
    await onRefresh();
  }

  async function handleSaveEdit(){
    await supabase.from('usuarios').update({ colaborador:editing.colaborador, setor:editing.setor, cargo:editing.cargo, status:editing.status }).eq('id',editing.id);
    setEditing(null); await onRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-sm">Pessoas / Licenças - {data.length} registros {loading&&<Loader2 className="inline w-4 h-4 animate-spin ml-2"/>}</h3>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          <button onClick={()=>fileRef.current?.click()} className="bg-[#001E33] border border-[#1e293b] text-white rounded-lg px-4 py-2 text-xs flex items-center gap-2"><Upload className="w-4 h-4"/> Importar</button>
          <button className="bg-[#D4AF37] text-black rounded-lg px-4 py-2 text-xs font-bold flex items-center gap-1"><Plus className="w-4 h-4"/> Novo Registro</button>
        </div>
      </div>

      {importing && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"><div className="bg-[#001E33] border border-[#1e293b] rounded-2xl p-6 w-full max-w-lg"><div className="flex gap-3"><Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin"/><h4 className="text-white font-bold">Importando {progress.percent}%</h4><span className="ml-auto text-xs text-[#94a3b8]">{progress.eta}</span></div><p className="text-white text-xs truncate mt-3">{progress.step}</p><div className="w-full bg-[#00121E] h-3 rounded-full mt-2"><div className="bg-[#D4AF37] h-3 rounded-full" style={{width:`${progress.percent}%`}}></div></div></div></div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#001E33] border border-[#1e293b] rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between"><h4 className="text-white font-bold">Editar</h4><button onClick={()=>setEditing(null)}><X className="w-5 h-5 text-white"/></button></div>
            <div className="space-y-3 mt-4">
              <input value={editing.colaborador} onChange={e=>setEditing({...editing,colaborador:e.target.value})} className="w-full bg-[#00121E] border border-[#1e293b] rounded p-2 text-white text-sm" placeholder="Nome"/>
              <input value={editing.setor} onChange={e=>setEditing({...editing,setor:e.target.value})} className="w-full bg-[#00121E] border border-[#1e293b] rounded p-2 text-white text-sm" placeholder="Setor"/>
              <input value={editing.cargo} onChange={e=>setEditing({...editing,cargo:e.target.value})} className="w-full bg-[#00121E] border border-[#1e293b] rounded p-2 text-white text-sm" placeholder="Cargo"/>
              <select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value})} className="w-full bg-[#00121E] border border-[#1e293b] rounded p-2 text-white text-sm"><option>ativo</option><option>inativo</option><option>afastado</option></select>
              <button onClick={handleSaveEdit} className="w-full bg-[#D4AF37] text-black rounded-lg p-2 font-bold flex justify-center gap-2"><Save className="w-4 h-4"/> Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#00121E] text-[#64748b] text-[11px]"><tr><th className="p-3 text-left">COLABORADOR</th><th className="p-3 text-left">SOFTWARE (PODE TER VARIOS)</th><th className="p-3 text-left">SETOR</th><th className="p-3 text-left">CARGO</th><th className="p-3 text-left">STATUS</th><th className="p-3 text-center">AÇÕES</th></tr></thead>
          <tbody>
            {data.map((u:any)=>(
              <tr key={u.id} className="border-t border-[#1e293b] text-white hover:bg-[#001a2e]">
                <td className="p-3"><div className="text-xs font-medium">{u.colaborador}</div><div className="text-[11px] text-[#64748b]">{u.email||u.login}</div></td>
                <td className="p-3 text-xs">{u.softwares?.map((s:any)=>s.nome).join(', ')}</td>
                <td className="p-3 text-xs text-[#94a3b8] truncate max-w-[200px]">{u.setor||'—'}</td>
                <td className="p-3 text-xs text-[#94a3b8] truncate max-w-[150px]">{u.cargo||'—'}</td>
                <td className="p-3"><span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">{u.status}</span></td>
                <td className="p-3"><div className="flex justify-center gap-2"><button onClick={()=>setEditing(u)} className="p-1.5 bg-[#1e293b] rounded hover:bg-[#D4AF37]/20"><Pencil className="w-4 h-4 text-[#D4AF37]"/></button><button onClick={()=>handleDelete(u.id)} className="p-1.5 bg-[#1e293b] rounded hover:bg-red-500/20"><Trash2 className="w-4 h-4 text-red-400"/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
