import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/Badges';
import { Users, Plus, Pencil, Trash2, Download, Upload, Settings2, X, Save } from 'lucide-react';
import { SoftwareManagement } from './SoftwareManagement';
import type { UsuarioLicenca, Software, SystemRole } from '@/types';

interface Props {
  data: UsuarioLicenca[]; // cada usuario já vem com softwares[]
  softwares: Software[];
  locais: any[];
  role: SystemRole;
  loading: boolean;
  onRefresh: () => void;
  onImportBatch: (file: File) => Promise<void>;
}

export function LicencasTable({ data, softwares, loading, onRefresh, onImportBatch }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [showSwManager, setShowSwManager] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [colaborador, setColaborador] = useState('');
  const [login, setLogin] = useState('');
  const [setor, setSetor] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchImport, setSearchImport] = useState(false);

  const swById = useMemo(() => {
    const m = new Map<string, Software>();
    softwares.forEach(s => m.set(s.id, s));
    return m;
  }, [softwares]);

  function resetForm() {
    setColaborador(''); setLogin(''); setSetor(''); setSelectedIds([]); setEditingId(null);
  }

  function openEdit(u: UsuarioLicenca) {
    setEditingId(u.id);
    setColaborador(u.colaborador);
    setLogin(u.login || '');
    setSetor(u.setor || '');
    // Pega do campo novo softwares[] ou do antigo software_id para compatibilidade
    const ids = u.softwares?.map(s=>s.id) || (u.software_id? [u.software_id] : []);
    setSelectedIds(ids);
    setShowForm(true);
  }

  function toggleSoftware(id: string) {
    setSelectedIds(prev => prev.includes(id)? prev.filter(i=>i!==id) : [...prev, id]);
  }

  async function handleSave() {
    if (!colaborador || selectedIds.length===0) { alert('Preencha nome e selecione ao menos 1 software. Ex: LUCAS | ACROBAT + PHOTOSHOP'); return; }

    const payloadUser = {
      colaborador: colaborador.trim(),
      login: (login || colaborador.toLowerCase().replace(/\s+/g, '.')).trim().toLowerCase(),
      setor: setor? setor.toUpperCase() : null
    };

    let userId = editingId;

    if (editingId) {
      await supabase.from('usuarios').update(payloadUser).eq('id', editingId);
    } else {
      const { data: novo, error } = await supabase.from('usuarios').insert(payloadUser).select('id').single();
      if (error) { alert(error.message); return; }
      userId = novo.id;
    }

    // MUITOS-PARA-MUITOS - Aqui consome 1 de cada software selecionado
    if (userId) {
      await supabase.from('usuario_softwares').delete().eq('usuario_id', userId);
      const inserts = selectedIds.map(swId => ({ usuario_id: userId!, software_id: swId }));
      await supabase.from('usuario_softwares').insert(inserts);
    }

    setShowForm(false);
    resetForm();
    onRefresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este usuario e todas suas licenças?')) return;
    await supabase.from('usuarios').delete().eq('id', id);
    onRefresh();
  }

  function handleExport() {
    const header = 'Colaborador;Login;Setor;Softwares;Status';
    const lines = data.map(u => {
      const softs = u.softwares?.map(s=>s.nome).join(' | ') || u.software?.nome || '';
      return `${u.colaborador};${u.login};${u.setor||''};${softs};${u.status}`;
    });
    const csv = [header,...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download=`licencas-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row justify-between gap-3">
        <div>
          <h2 className="text-white font-bold flex items-center gap-2"><Users className="w-5 h-5 text-[#D4AF37]" />Pessoas / Licenças - {data.length} registros</h2>
          <p className="text-[#94a3b8] text-xs mt-1">Dashboard agora consome 1 de cada app. Ex: LUCAS | ACROBAT + PHOTOSHOP = -1 Acrobat e -1 Photoshop</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>setShowSwManager(true)} className="border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37] px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1"><Settings2 className="w-4 h-4" /> Gerenciar Softwares ({softwares.length})</button>
          <button onClick={handleExport} className="border border-[#1e293b] px-3 py-2 rounded-lg text-sm text-[#94a3b8] flex items-center gap-1"><Download className="w-4 h-4" /> Exportar</button>
          <button onClick={() => setSearchImport(!searchImport)} className="border border-[#1e293b] px-3 py-2 rounded-lg text-sm text-[#94a3b8] flex items-center gap-1"><Upload className="w-4 h-4" /> Importar</button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-[#D4AF37] text-[#001726] font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Novo Registro</button>
        </div>
      </div>

      {searchImport && (
        <div className="bg-[#001E33] p-4 rounded-xl border border-[#1e293b]">
          <input type="file" accept=".csv" onChange={e => { const f = e.target.files?.[0]; if(f) onImportBatch(f); }} className="text-white text-sm" />
        </div>
      )}

      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#001726] border-b border-[#1e293b]">
              <tr>
                <th className="px-4 py-3 text-xs text-[#94a3b8]">COLABORADOR</th>
                <th className="px-4 py-3 text-xs text-[#94a3b8]">SOFTWARE (PODE TER VARIOS)</th>
                <th className="px-4 py-3 text-xs text-[#94a3b8]">SETOR</th>
                <th className="px-4 py-3 text-xs text-[#94a3b8]">STATUS</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]">
              {loading? <tr><td colSpan={5} className="px-4 py-6 text-center text-[#94a3b8]">Carregando...</td></tr> :
                data.map(u => (
                  <tr key={u.id} className="hover:bg-[#001726]/50">
                    <td className="px-4 py-3 text-white text-sm">{u.colaborador}<p className="text-xs text-[#64748b]">{u.login}</p></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(u.softwares && u.softwares.length>0? u.softwares : u.software? [u.software] : []).map((s:any) => (
                          <span key={s.id} className="bg-[#001726] border border-[#1e293b] text-[#D4AF37] text-[11px] px-2 py-1 rounded-full font-bold">{s.nome}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#94a3b8]">{u.setor || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3 flex gap-1 justify-end">
                      <button onClick={() => openEdit(u)} className="p-1.5 text-[#94a3b8] hover:text-[#D4AF37]"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(u.id)} className="p-1.5 text-[#94a3b8] hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#001E33] p-6 rounded-xl w-full max-w-[460px] border border-[#1e293b] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center"><h3 className="text-white font-bold">{editingId? 'Editar' : 'Cadastrar'} Pessoa - Consome licença</h3><button onClick={()=>setShowForm(false)}><X className="w-4 h-4 text-[#94a3b8]" /></button></div>

            <input value={colaborador} onChange={e=>setColaborador(e.target.value)} placeholder="Nome ex: LUCAS" className="w-full bg-[#001726] border border-[#1e293b] rounded px-3 py-2 text-white text-sm" />
            <input value={login} onChange={e=>setLogin(e.target.value)} placeholder="Login ou Email" className="w-full bg-[#001726] border border-[#1e293b] rounded px-3 py-2 text-white text-sm" />
            <input value={setor} onChange={e=>setSetor(e.target.value)} placeholder="Setor" className="w-full bg-[#001726] border border-[#1e293b] rounded px-3 py-2 text-white text-sm" />

            <div className="space-y-2">
              <p className="text-xs text-[#D4AF37] font-bold uppercase">Selecione os Softwares - Pode marcar varios</p>
              <p className="text-[11px] text-[#64748b]">Ex: LUCAS | ACROBAT PRO DC + PHOTOSHOP = vai descontar 1 de cada</p>
              <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto bg-[#001726] p-3 rounded-lg border border-[#1e293b]">
                {softwares.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm text-white cursor-pointer hover:bg-[#001E33] p-1.5 rounded">
                    <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={()=>toggleSoftware(s.id)} className="accent-[#D4AF37]" />
                    <span className="flex-1">{s.nome} {s.qtd_contratada>0? `(${s.qtd_contratada})` : '(consome do pool)'}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.is_adobe? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-sky-400/20 text-sky-400'}`}>{s.is_adobe? s.tipo_adobe : 'OUTRO'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={()=>setShowForm(false)} className="flex-1 border border-[#1e293b] py-2 rounded text-white text-sm">Cancelar</button>
              <button onClick={handleSave} className="flex-1 bg-[#D4AF37] py-2 rounded font-bold text-sm text-[#001726] flex items-center justify-center gap-1"><Save className="w-4 h-4" /> Salvar</button>
            </div>
          </div>
        </div>
      )}

      {showSwManager && (
        <SoftwareManagement softwares={softwares} onClose={()=>setShowSwManager(false)} onRefresh={onRefresh} />
      )}
    </div>
  );
}
export default LicencasTable;
