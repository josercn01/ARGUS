import { useState, useRef, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Plus, Loader2, Pencil, Trash2, X, Save, Minus, Search, Download } from 'lucide-react';

export function LicencasTable({ data, softwares, loading, onRefresh }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [softwareToAdd, setSoftwareToAdd] = useState('');

  // --- FILTRO DIGITÁVEL ---
  const [setorTxt, setSetorTxt] = useState('');
  const [nomeTxt, setNomeTxt] = useState('');

  const setoresUnicos = useMemo(() => {
    return [...new Set(data.map((u: any) => u.setor).filter(Boolean))].sort() as string[];
  }, [data]);

  const sugestoes = useMemo(() => {
    if (!setorTxt) return [];
    return setoresUnicos.filter((s: string) => s.toLowerCase().includes(setorTxt.toLowerCase())).slice(0, 8);
  }, [setorTxt, setoresUnicos]);

  const filteredData = useMemo(() => {
    return data.filter((u: any) => {
      const mSetor = setorTxt? u.setor?.toLowerCase().includes(setorTxt.toLowerCase()) : true;
      const mNome = nomeTxt? u.colaborador?.toLowerCase().includes(nomeTxt.toLowerCase()) || u.email?.toLowerCase().includes(nomeTxt.toLowerCase()) : true;
      return mSetor && mNome;
    });
  }, [data, setorTxt, nomeTxt]);

  function handleExport() {
    const header = ['Colaborador', 'Email', 'Setor', 'Cargo', 'Status', 'Softwares'].join(';');
    const rows = filteredData.map((u: any) => {
      const softs = (u.softwares || []).map((s: any) => s.nome).join(' | ');
      return [u.colaborador, u.email, u.setor, u.cargo, u.status, softs].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(';');
    });
    const csv = [header,...rows].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ARGUS_${setorTxt || 'todos_setores'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este colaborador?')) return;
    await supabase.from('usuario_softwares').delete().eq('usuario_id', id);
    await supabase.from('usuarios').delete().eq('id', id);
    onRefresh();
  }

  async function handleSave() {
    await supabase.from('usuarios').update({
      colaborador: editing.colaborador,
      setor: editing.setor,
      cargo: editing.cargo,
      status: editing.status
    }).eq('id', editing.id);
    setEditing(null);
    onRefresh();
  }

  async function removeSoftware(swId: string) {
    await supabase.from('usuario_softwares').delete().eq('usuario_id', editing.id).eq('software_id', swId);
    setEditing({...editing, softwares: editing.softwares.filter((s: any) => (s.software_id || s.id)!== swId) });
    onRefresh();
  }

  async function addSoftware() {
    if (!softwareToAdd) return;
    const exists = editing.softwares.some((s: any) => (s.software_id || s.id) === softwareToAdd);
    if (exists) return alert('Já tem esse software');
    await supabase.from('usuario_softwares').insert({ usuario_id: editing.id, software_id: softwareToAdd });
    const novo = softwares.find((s: any) => s.id === softwareToAdd);
    setEditing({...editing, softwares: [...editing.softwares, { software_id: novo.id, id: novo.id, nome: novo.nome }] });
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
              <button onClick={() => setEditing(null)}><X className="w-5 h-5 text-white" /></button>
            </div>
            <div className="space-y-3">
              <input value={editing.colaborador} onChange={e => setEditing({...editing, colaborador: e.target.value })} className="w-full bg-[#00121E] border border-[#1e293b] rounded-lg p-2.5 text-white text-sm" />
              <input value={editing.setor || ''} onChange={e => setEditing({...editing, setor: e.target.value })} className="w-full bg-[#00121E] border border-[#1e293b] rounded-lg p-2.5 text-white text-sm" placeholder="Setor" />
              <input value={editing.cargo || ''} onChange={e => setEditing({...editing, cargo: e.target.value })} className="w-full bg-[#00121E] border border-[#1e293b] rounded-lg p-2.5 text-white text-sm" placeholder="Cargo" />
              <select value={editing.status} onChange={e => setEditing({...editing, status: e.target.value })} className="w-full bg-[#00121E] border border-[#1e293b] rounded-lg p-2.5 text-white text-sm">
                <option value="ativo">ativo</option><option value="inativo">inativo</option><option value="afastado">afastado</option>
              </select>
              <div className="pt-3 border-t border-[#1e293b]">
                <p className="text-[11px] font-bold text-[#D4AF37] mb-2">SOFTWARES QUE A PESSOA TEM</p>
                {editing.softwares?.map((s: any) => (
                  <div key={s.software_id || s.id} className="flex justify-between items-center bg-[#00121E] border border-[#1e293b] rounded-lg px-3 py-2 mb-2">
                    <span className="text-white text-xs">{s.nome}</span>
                    <button onClick={() => removeSoftware(s.software_id || s.id)} className="bg-red-500/10 hover:bg-red-500/20 p-1.5 rounded"><Minus className="w-3 h-3 text-red-400" /></button>
                  </div>
                ))}
                {editing.softwares?.length === 0 && <p className="text-xs text-[#64748b] mb-2">Nenhum software</p>}
                <div className="flex gap-2">
                  <select value={softwareToAdd} onChange={e => setSoftwareToAdd(e.target.value)} className="flex-1 bg-[#00121E] border border-[#1e293b] rounded-lg p-2 text-white text-xs">
                    <option value="">+ Adicionar software...</option>
                    {softwares.filter((sw: any) =>!editing.softwares.some((es: any) => (es.software_id || es.id) === sw.id)).map((sw: any) => <option key={sw.id} value={sw.id}>{sw.nome}</option>)}
                  </select>
                  <button onClick={addSoftware} className="bg-[#1e293b] hover:bg-[#D4AF37]/20 border border-[#1e293b] rounded-lg px-3"><Plus className="w-4 h-4 text-[#D4AF37]" /></button>
                </div>
              </div>
              <button onClick={handleSave} className="w-full bg-[#E6C45A] hover:bg-[#D4AF37] text-black rounded-xl p-3 font-bold flex justify-center gap-2 mt-2"><Save className="w-4 h-4" /> Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        {/* HEADER COM FILTRO + EXPORT */}
        <div className="p-3 flex flex-col lg:flex-row gap-3 justify-between">
          <h3 className="text-white text-sm font-bold shrink-0">Pessoas / Licenças - {filteredData.length}/{data.length} registros {loading && <Loader2 className="w-4 h-4 animate-spin inline ml-2" />}</h3>

          <div className="flex flex-1 gap-2 max-w-[700px]">
            <div className="flex-1 relative">
              <div className="flex items-center bg-[#00121E] border border-[#1e293b] rounded-lg px-3">
                <Search className="w-4 h-4 text-[#64748b]" />
                <input value={setorTxt} onChange={e => setSetorTxt(e.target.value)} placeholder="Filtrar depto: SECOM, DGER..." className="w-full bg-transparent p-2 text-white text-xs outline-none" />
              </div>
              {sugestoes.length > 0 && (
                <div className="absolute z-20 top-9 left-0 right-0 bg-[#00121E] border border-[#1e293b] rounded-lg max-h-48 overflow-y-auto">
                  {sugestoes.map(s => <button key={s} onClick={() => setSetorTxt(s)} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-[#1e293b]">{s}</button>)}
                </div>
              )}
            </div>
            <div className="flex-1 flex items-center bg-[#00121E] border border-[#1e293b] rounded-lg px-3">
              <Search className="w-4 h-4 text-[#64748b]" />
              <input value={nomeTxt} onChange={e => setNomeTxt(e.target.value)} placeholder="Nome ou e-mail..." className="w-full bg-transparent p-2 text-white text-xs outline-none" />
            </div>
            <button onClick={handleExport} className="bg-[#D4AF37] text-black rounded-lg px-3 py-2 text-xs font-bold flex items-center gap-1 shrink-0"><Download className="w-4 h-4" />Exportar {setorTxt? `(${setorTxt})` : ''}</button>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-[#00121E] text-[#64748b] text-[11px]"><tr><th className="p-3 text-left">COLABORADOR</th><th className="p-3 text-left">SOFTWARE</th><th className="p-3 text-left">SETOR</th><th className="p-3 text-left">CARGO</th><th className="p-3">STATUS</th><th className="p-3 text-center">AÇÕES</th></tr></thead>
          <tbody>
            {filteredData.map((u: any) => (
              <tr key={u.id} className="border-t border-[#1e293b] text-white hover:bg-[#001a2e]">
                <td className="p-3 text-xs">{u.colaborador}<br /><span className="text-[11px] text-[#64748b]">{u.email}</span></td>
                <td className="p-3 text-xs">{u.softwares?.map((s: any) => s.nome).join(', ')}</td>
                <td className="p-3 text-xs text-[#94a3b8] max-w-[150px] truncate">{u.setor}</td>
                <td className="p-3 text-xs text-[#94a3b8] max-w-[150px] truncate">{u.cargo}</td>
                <td className="p-3"><span className="text-[11px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">{u.status}</span></td>
                <td className="p-3"><div className="flex justify-center gap-2"><button onClick={() => setEditing(u)} className="p-1.5 bg-[#1e293b] rounded"><Pencil className="w-4 h-4 text-[#D4AF37]" /></button><button onClick={() => handleDelete(u.id)} className="p-1.5 bg-[#1e293b] rounded"><Trash2 className="w-4 h-4 text-red-400" /></button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
