import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Plus, Loader2, Pencil, Trash2, X, Save, Minus } from 'lucide-react';

export function LicencasTable({ data, softwares, loading, onRefresh }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [softwareToAdd, setSoftwareToAdd] = useState('');

  async function handleDelete(id:string){
    if(!confirm('Excluir este colaborador?')) return;
    await supabase.from('usuario_softwares').delete().eq('usuario_id',id);
    await supabase.from('usuarios').delete().eq('id',id);
    onRefresh();
  }

  async function handleSave(){
    await supabase.from('usuarios').update({
      colaborador: editing.colaborador,
      setor: editing.setor,
      cargo: editing.cargo,
      status: editing.status
    }).eq('id', editing.id);
    setEditing(null); onRefresh();
  }

  async function removeSoftware(swId:string){
    await supabase.from('usuario_softwares').delete().eq('usuario_id', editing.id).eq('software_id', swId);
    setEditing({...editing, softwares: editing.softwares.filter((s:any)=> (s.software_id||s.id)!==swId)});
    onRefresh();
  }

  async function addSoftware(){
    if(!softwareToAdd) return;
    const exists = editing.softwares.some((s:any)=> (s.software_id||s.id)===softwareToAdd);
    if(exists) return alert('Já tem esse software');
    await supabase.from('usuario_softwares').insert({ usuario_id: editing.id, software_id: softwareToAdd });
    const novo = softwares.find((s:any)=>s.id===softwareToAdd);
    setEditing({...editing, softwares: [...editing.softwares, { software_id: novo.id, id: novo.id, nome: novo.nome }]});
    setSoftwareToAdd('');
    onRefresh();
  }

  return (
    <>
      {editing && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#0a1930] border border-[#1e293b] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between mb-4">
              <h4 className="text-white font-bold">Editar</h4>
              <button onClick={()=>setEditing(null)}><X className="w-5 h-5 text-white"/></button>
            </div>

            <div className="space-y-3">
              <input value={editing.colaborador} onChange={e=>setEditing({...editing,colaborador:e.target.value})} className="w-full bg-[#00121E] border border-[#1e293b] rounded-lg p-2.5 text-white text-sm"/>
              <input value={editing.setor||''} onChange={e=>setEditing({...editing,setor:e.target.value})} className="w-full bg-[#00121E] border border-[#1e293b] rounded-lg p-2.5 text-white text-sm" placeholder="Setor"/>
              <input value={editing.cargo||''} onChange={e=>setEditing({...editing,cargo:e.target.value})} className="w-full bg-[#00121E] border border-[#1e293b] rounded-lg p-2.5 text-white text-sm" placeholder="Cargo"/>
              <select value={editing.status} onChange={e=>setEditing({...editing,status:e.target.value})} className="w-full bg-[#00121E] border border-[#1e293b] rounded-lg p-2.5 text-white text-sm">
                <option value="ativo">ativo</option><option value="inativo">inativo</option><option value="afastado">afastado</option>
              </select>

              {/* AQUI É O NOVO */}
              <div className="pt-3 border-t border-[#1e293b]">
                <p className="text-[11px] font-bold text-[#D4AF37] mb-2">SOFTWARES QUE A PESSOA TEM</p>
                {editing.softwares?.map((s:any)=>(
                  <div key={s.software_id||s.id} className="flex justify-between items-center bg-[#00121E] border border-[#1e293b] rounded-lg px-3 py-2 mb-2">
                    <span className="text-white text-xs">{s.nome}</span>
                    <button onClick={()=>removeSoftware(s.software_id||s.id)} className="bg-red-500/10 hover:bg-red-500/20 p-1.5 rounded"><Minus className="w-3 h-3 text-red-400"/></button>
                  </div>
                ))}
                {editing.softwares?.length===0 && <p className="text-xs text-[#64748b] mb-2">Nenhum software</p>}

                <div className="flex gap-2">
                  <select value={softwareToAdd} onChange={e=>setSoftwareToAdd(e.target.value)} className="flex-1 bg-[#00121E] border border-[#1e293b] rounded-lg p-2 text-white text-xs">
                    <option value="">+ Adicionar software...</option>
                    {softwares.filter((sw:any)=>!editing.softwares.some((es:any)=>(es.software_id||es.id)===sw.id)).map((sw:any)=><option key={sw.id} value={sw.id}>{sw.nome}</option>)}
                  </select>
                  <button onClick={addSoftware} className="bg-[#1e293b] hover:bg-[#D4AF37]/20 border border-[#1e293b] rounded-lg px-3"><Plus className="w-4 h-4 text-[#D4AF37]"/></button>
                </div>
              </div>

              <button onClick={handleSave} className="w-full bg-[#E6C45A] hover:bg-[#D4AF37] text-black rounded-xl p-3 font-bold flex justify-center gap-2 mt-2"><Save className="w-4 h-4"/> Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="p-3 flex justify-between"><h3 className="text-white text-sm font-bold">Pessoas / Licenças - {data.length} registros {loading&&<Loader2 className="w-4 h-4 animate-spin inline ml-2"/>}</h3></div>
        <table className="w-full text-sm">
          <thead className="bg-[#00121E] text-[#64748b] text-[11px]"><tr><th className="p-3 text-left">COLABORADOR</th><th className="p-3 text-left">SOFTWARE (PODE TER VARIOS)</th><th className="p-3 text-left">SETOR</th><th className="p-3 text-left">CARGO</th><th className="p-3">STATUS</th><th className="p-3 text-center">AÇÕES</th></tr></thead>
          <tbody>
            {data.map((u:any)=>(
              <tr key={u.id} className="border-t border-[#1e293b] text-white">
                <td className="p-3 text-xs">{u.colaborador}<br/><span className="text-[11px] text-[#64748b]">{u.email}</span></td>
                <td className="p-3 text-xs">{u.softwares?.map((s:any)=>s.nome).join(', ')}</td>
                <td className="p-3 text-xs text-[#94a3b8] max-w-[150px] truncate">{u.setor}</td>
                <td className="p-3 text-xs text-[#94a3b8] max-w-[150px] truncate">{u.cargo}</td>
                <td className="p-3"><span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">{u.status}</span></td>
                <td className="p-3"><div className="flex justify-center gap-2"><button onClick={()=>setEditing(u)} className="p-1.5 bg-[#1e293b] rounded"><Pencil className="w-4 h-4 text-[#D4AF37]"/></button><button onClick={()=>handleDelete(u.id)} className="p-1.5 bg-[#1e293b] rounded"><Trash2 className="w-4 h-4 text-red-400"/></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
