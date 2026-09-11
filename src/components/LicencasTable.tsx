import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/Badges';
import { Users, Plus, Pencil, Trash2, Download, Upload, Settings2, X, Save } from 'lucide-react';
import type { UsuarioLicenca, Software, SystemRole } from '@/types';

interface Props {
  data: UsuarioLicenca[];
  softwares: Software[];
  locais: any[];
  role: SystemRole;
  loading: boolean;
  onRefresh: () => void;
  onImportBatch: (file: File, onProgress?: any) => Promise<void>;
}

export function LicencasTable({ data, softwares, loading, onRefresh, onImportBatch }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<UsuarioLicenca>>({ status: 'ativo' });
  const [searchImport, setSearchImport] = useState(false);

  // MODAL DE SOFTWARE DENTRO DA TELA
  const [showSwModal, setShowSwModal] = useState(false);
  const [swForm, setSwForm] = useState<Partial<Software>>({ nome: '', familia: 'SINGLE_POOL', qtd_contratada: 0 });

  const swById = useMemo(() => {
    const m = new Map<string, Software>();
    softwares.forEach(s => m.set(s.id, s));
    return m;
  }, [softwares]);

  function getSoftwareNome(u: UsuarioLicenca) {
    return u.software?.nome || swById.get(u.software_id)?.nome || '—';
  }
  function getFamilia(u: UsuarioLicenca) {
    return u.software?.familia || swById.get(u.software_id)?.familia || '—';
  }

  async function handleSave() {
    if (!form.colaborador ||!form.software_id) { alert('Preencha nome e software'); return; }
    const payload = {
      colaborador: form.colaborador.trim(),
      login: (form.login || form.colaborador.toLowerCase().replace(/\s+/g, '.')).trim().toLowerCase(),
      setor: form.setor? form.setor.toUpperCase() : null,
      software_id: form.software_id,
      status: form.status || 'ativo'
    };
    if ((form as any).id) await supabase.from('usuarios').update(payload).eq('id', (form as any).id);
    else await supabase.from('usuarios').insert(payload);
    setShowForm(false); setForm({ status: 'ativo' }); onRefresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este registro?')) return;
    await supabase.from('usuarios').delete().eq('id', id); onRefresh();
  }

  // CRUD DE SOFTWARE AQUI DENTRO
  async function handleSaveSoftware() {
    if (!swForm.nome) { alert('Nome obrigatorio'); return; }
    const payload = { nome: swForm.nome.trim(), familia: swForm.familia, qtd_contratada: Number(swForm.qtd_contratada) || 0 };
    if ((swForm as any).id) await supabase.from('softwares').update(payload).eq('id', (swForm as any).id);
    else await supabase.from('softwares').insert(payload);
    setShowSwModal(false); setSwForm({ nome: '', familia: 'SINGLE_POOL', qtd_contratada: 0 }); onRefresh();
  }
  async function handleDeleteSw(id: string) {
    if (!confirm('Excluir software? Pessoas usando ele ficarao sem vinculo.')) return;
    await supabase.from('softwares').delete().eq('id', id); onRefresh();
  }

  function handleExport() {
    const header = 'Colaborador;Login;Setor;Software;Familia;Status';
    const lines = data.map(u => `${u.colaborador};${u.login};${u.setor || ''};${getSoftwareNome(u)};${getFamilia(u)};${u.status}`);
    const csv = [header,...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `licencas-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  const totalBaldes = softwares.filter(s=>s.qtd_contratada>0).reduce((a,s)=>a+s.qtd_contratada,0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row justify-between gap-3">
        <div>
          <h2 className="text-white font-bold flex items-center gap-2"><Users className="w-5 h-5 text-[#D4AF37]" />Pessoas / Licencas - {data.length} registros</h2>
          <p className="text-[#94a3b8] text-xs mt-1">Photoshop: {data.filter(d=>getSoftwareNome(d)==='Photoshop').length} | Illustrator: {data.filter(d=>getSoftwareNome(d)==='Illustrator').length} | Todos os Apps: {data.filter(d=>getSoftwareNome(d).toLowerCase().includes('todos')).length} | Balde total: {totalBaldes}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>setShowSwModal(true)} className="border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1"><Settings2 className="w-4 h-4" /> Gerenciar Softwares ({softwares.length})</button>
          <button onClick={handleExport} className="border border-[#1e293b] px-3 py-2 rounded-lg text-sm text-[#94a3b8] flex items-center gap-1"><Download className="w-4 h-4" /> Exportar</button>
          <button onClick={() => setSearchImport(!searchImport)} className="border border-[#1e293b] px-3 py-2 rounded-lg text-sm text-[#94a3b8] flex items-center gap-1"><Upload className="w-4 h-4" /> Importar</button>
          <button onClick={() => setShowForm(true)} className="bg-[#D4AF37] text-[#001726] font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Novo Registro</button>
        </div>
      </div>

      {searchImport && (
        <div className="bg-[#001E33] p-4 rounded-xl border border-[#1e293b]">
          <input type="file" accept=".csv" onChange={e => { const f = e.target.files?.[0]; if(f) onImportBatch(f); }} className="text-white text-sm" />
          <p className="text-[11px] text-[#64748b] mt-2">Sua planilha Email Nome Produto ja consome do balde 225 202 202 automaticamente</p>
        </div>
      )}

      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#001726] border-b border-[#1e293b]">
              <tr><th className="px-4 py-3 text-xs text-[#94a3b8]">COLABORADOR</th><th className="px-4 py-3 text-xs text-[#94a3b8]">SOFTWARE TIPO REAL</th><th className="px-4 py-3 text-xs text-[#94a3b8]">BALDE</th><th className="px-4 py-3 text-xs text-[#94a3b8]">SETOR</th><th className="px-4 py-3 text-xs text-[#94a3b8]">STATUS</th><th className="w-20"></th></tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading? <tr><td colSpan={6} className="px-4 py-6 text-center text-[#94a3b8]">Carregando...</td></tr> :
                data.map(u => (
                  <tr key={u.id} className="hover:bg-[#001726]/50">
                    <td className="px-4 py-3 text-white text-sm">{u.colaborador}<p className="text-xs text-[#64748b]">{u.login}</p></td>
                    <td className="px-4 py-3 text-[#D4AF37] text-sm font-bold">{getSoftwareNome(u)}</td>
                    <td className="px-4 py-3 text-xs text-[#94a3b8]">{getFamilia(u)}</td>
                    <td className="px-4 py-3 text-sm text-[#94a3b8]">{u.setor || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3 flex gap-1 justify-end"><button onClick={() => { setForm(u); setShowForm(true); }} className="p-1.5 text-[#94a3b8] hover:text-[#D4AF37]"><Pencil className="w-4 h-4" /></button><button onClick={() => handleDelete(u.id)} className="p-1.5 text-[#94a3b8] hover:text-red-400"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#001E33] p-6 rounded-xl w-full max-w-[420px] border border-[#1e293b] space-y-3">
            <div className="flex justify-between items-center"><h3 className="text-white font-bold">Cadastrar Pessoa - Consome licenca</h3><button onClick={()=>setShowForm(false)}><X className="w-4 h-4 text-[#94a3b8]" /></button></div>
            <input value={form.colaborador||''} onChange={e=>setForm({...form, colaborador: e.target.value})} placeholder="Nome colaborador" className="w-full bg-[#001726] border border-[#1e293b] rounded px-3 py-2 text-white text-sm" />
            <input value={form.login||''} onChange={e=>setForm({...form, login: e.target.value})} placeholder="Login ou Email" className="w-full bg-[#001726] border border-[#1e293b] rounded px-3 py-2 text-white text-sm" />
            <input value={form.setor||''} onChange={e=>setForm({...form, setor: e.target.value})} placeholder="Setor" className="w-full bg-[#001726] border border-[#1e293b] rounded px-3 py-2 text-white text-sm" />
            <select value={form.software_id||''} onChange={e=>setForm({...form, software_id: e.target.value})} className="w-full bg-[#001726] border border-[#1e293b] rounded px-3 py-2 text-white text-sm">
              <option value="">Selecione o software cadastrado</option>
              {softwares.map(s => (<option key={s.id} value={s.id}>{s.nome} {s.qtd_contratada>0? `BALDE ${s.qtd_contratada}` : `consome do ${s.familia}`}</option>))}
            </select>
            <div className="flex gap-2 pt-2"><button onClick={()=>setShowForm(false)} className="flex-1 border border-[#1e293b] py-2 rounded text-white text-sm">Cancelar</button><button onClick={handleSave} className="flex-1 bg-[#D4AF37] py-2 rounded font-bold text-sm text-[#001726] flex items-center justify-center gap-1"><Save className="w-4 h-4" /> Salvar</button></div>
          </div>
        </div>
      )}

      {showSwModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#001E33] p-6 rounded-xl w-full max-w-[520px] border border-[#D4AF37]/20 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center"><h3 className="text-white font-bold flex items-center gap-2"><Settings2 className="w-5 h-5 text-[#D4AF37]" /> Gerenciar Softwares - Cadastro</h3><button onClick={()=>setShowSwModal(false)}><X className="w-5 h-5 text-[#94a3b8]" /></button></div>

            <div className="bg-[#001726] p-3 rounded-lg border border-[#1e293b] space-y-2">
              <p className="text-xs text-[#D4AF37] font-bold uppercase">{(swForm as any).id? 'Editando' : 'Novo Software'}</p>
              <input value={swForm.nome||''} onChange={e=>setSwForm({...swForm, nome: e.target.value})} placeholder="Ex: Photoshop, AutoCAD, Todos os Apps ETLA" className="w-full bg-[#001E33] border border-[#1e293b] rounded px-3 py-2 text-white text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select value={swForm.familia||'SINGLE_POOL'} onChange={e=>setSwForm({...swForm, familia: e.target.value})} className="bg-[#001E33] border border-[#1e293b] rounded px-3 py-2 text-white text-sm">
                  <option value="ALL_APPS">ALL_APPS - Todos os Apps (BALDE 202)</option>
                  <option value="ACROBAT">ACROBAT - Acrobat (BALDE 202)</option>
                  <option value="SINGLE_POOL">SINGLE_POOL - Pool 225 (Photoshop, Illustrator...)</option>
                </select>
                <input type="number" value={swForm.qtd_contratada||0} onChange={e=>setSwForm({...swForm, qtd_contratada: Number(e.target.value)})} placeholder="Qtd contratada - 0 para filhos" className="bg-[#001E33] border border-[#1e293b] rounded px-3 py-2 text-white text-sm" />
              </div>
              <p className="text-[11px] text-[#64748b]">Se qtd maior que 0 vira BALDE. Se 0 vira app filho que consome do balde.</p>
              <button onClick={handleSaveSoftware} className="w-full bg-[#D4AF37] text-[#001726] font-bold py-2 rounded text-sm">Salvar Software</button>
            </div>

            <div className="space-y-2">
              {softwares.map(s => (
                <div key={s.id} className="flex justify-between items-center bg-[#001726] border border-[#1e293b] rounded px-3 py-2">
                  <div><p className="text-white text-sm font-bold">{s.nome} {s.qtd_contratada>0 && <span className="text-[#D4AF37]">- BALDE {s.qtd_contratada}</span>}</p><p className="text-[11px] text-[#64748b]">{s.familia} {s.qtd_contratada===0? '- consome do balde' : ''}</p></div>
                  <div className="flex gap-1"><button onClick={()=>setSwForm(s)} className="p-1 text-[#94a3b8] hover:text-white"><Pencil className="w-4 h-4" /></button><button onClick={()=>handleDeleteSw(s.id)} className="p-1 text-red-400"><Trash2 className="w-4 h-4" /></button></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default LicencasTable;
