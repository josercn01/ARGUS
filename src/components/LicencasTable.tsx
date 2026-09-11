import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/Badges';
import { Users, Plus, Pencil, Trash2, Download, Upload, Trash } from 'lucide-react';
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

export function LicencasTable({ data, softwares, role, loading, onRefresh, onImportBatch }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<UsuarioLicenca>>({ status: 'ativo' });
  const [searchImport, setSearchImport] = useState(false);

  const swById = useMemo(() => {
    const m = new Map<string, Software>();
    softwares.forEach(s => m.set(s.id, s));
    return m;
  }, [softwares]);

  // FILTRO DIDÁTICO: Mostra o tipo real, não "App Individual"
  function getSoftwareNome(u: UsuarioLicenca) {
    return u.software?.nome || swById.get(u.software_id)?.nome || '—';
  }

  async function handleSave() {
    if (!form.colaborador ||!form.software_id) return alert('Preencha nome e software');
    const payload = {
      colaborador: form.colaborador,
      login: form.login || form.colaborador.toLowerCase().replace(/\s/g,'.'),
      setor: form.setor?.toUpperCase() || null,
      software_id: form.software_id,
      status: form.status || 'ativo'
    };
    if ((form as any).id) {
      await supabase.from('usuarios').update(payload).eq('id', (form as any).id);
    } else {
      await supabase.from('usuarios').insert(payload);
    }
    setShowForm(false);
    setForm({ status: 'ativo' });
    onRefresh();
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir?')) return;
    await supabase.from('usuarios').delete().eq('id', id);
    onRefresh();
  }

  function handleExport() {
    const csv = ['Colaborador;Login;Setor;Software;Familia;Status',
     ...data.map(u => `${u.colaborador};${u.login};${u.setor};${getSoftwareNome(u)};${u.software?.familia || swById.get(u.software_id)?.familia};${u.status}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `licencas-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h2 className="text-white font-bold flex items-center gap-2"><Users className="w-5 h-5 text-[#D4AF37]" />Pessoas / Licenças - {data.length} registros</h2>
          <p className="text-[#94a3b8] text-xs mt-1">
            Photoshop: {data.filter(d=>getSoftwareNome(d)==='Photoshop').length} |
            Illustrator: {data.filter(d=>getSoftwareNome(d)==='Illustrator').length} |
            Todos os Apps: {data.filter(d=>getSoftwareNome(d).includes('Todos')).length}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="border border-[#1e293b] px-3 py-2 rounded-lg text-sm text-[#94a3b8]"><Download className="w-4 h-4" /></button>
          <button onClick={() => setSearchImport(!searchImport)} className="border border-[#1e293b] px-3 py-2 rounded-lg text-sm text-[#94a3b8]"><Upload className="w-4 h-4" /> Importar</button>
          <button onClick={() => setShowForm(true)} className="bg-[#D4AF37] text-[#001726] font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Novo Registro</button>
        </div>
      </div>

      {searchImport && (
        <div className="bg-[#001E33] p-4 rounded-xl border border-[#1e293b]">
          <input type="file" accept=".csv" onChange={e => e.target.files?.[0] && onImportBatch(e.target.files[0])} className="text-white" />
          <p className="text-[11px] text-[#64748b] mt-2">Sua planilha Email;Nome;Produto -> já consome do balde 225/202/202 automaticamente</p>
        </div>
      )}

      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#001726] border-b border-[#1e293b]"><tr><th className="px-4 py-3 text-xs text-[#94a3b8]">COLABORADOR</th><th className="px-4 py-3 text-xs text-[#94a3b8]">SOFTWARE (TIPO REAL)</th><th className="px-4 py-3 text-xs text-[#94a3b8]">BALDE</th><th className="px-4 py-3 text-xs text-[#94a3b8]">SETOR</th><th className="px-4 py-3 text-xs text-[#94a3b8]">STATUS</th><th className="w-20"></th></tr></thead>
          <tbody className="divide-y divide-[#1e293b]">
            {data.map(u => (
              <tr key={u.id} className="hover:bg-[#001726]/50">
                <td className="px-4 py-3 text-white text-sm">{u.colaborador}<p className="text-xs text-[#64748b]">{u.login}</p></td>
                <td className="px-4 py-3 text-[#D4AF37] text-sm font-bold">{getSoftwareNome(u)}</td>
                <td className="px-4 py-3 text-xs text-[#94a3b8]">{u.software?.familia || swById.get(u.software_id)?.familia}</td>
                <td className="px-4 py-3 text-sm text-[#94a3b8]">{u.setor || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-3 flex gap-1 justify-end"><button onClick={() => { setForm(u); setShowForm(true); }}><Pencil className="w-4 h-4 text-[#94a3b8]" /></button><button onClick={() => handleDelete(u.id)}><Trash2 className="w-4 h-4 text-red-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#001E33] p-6 rounded-xl w-[420px] border border-[#1e293b] space-y-3">
            <h3 className="text-white font-bold">Cadastrar Pessoa - Consome licença</h3>
            <input value={form.colaborador||''} onChange={e=>setForm({...form, colaborador: e.target.value})} placeholder="Nome colaborador" className="w-full bg-[#001726] border border-[#1e293b] rounded px-3 py-2 text-white" />
            <input value={form.login||''} onChange={e=>setForm({...form, login: e.target.value})} placeholder="Login / Email" className="w-full bg-[#001726] border border-[#1e293b] rounded px-3 py-2 text-white" />
            <input value={form.setor||''} onChange={e=>setForm({...form, setor: e.target.value})} placeholder="Setor" className="w-full bg-[#001726] border border-[#1e293b] rounded px-3 py-2 text-white" />
            <select value={form.software_id||''} onChange={e=>setForm({...form, software_id: e.target.value})} className="w-full bg-[#001726] border border-[#1e293b] rounded px-3 py-2 text-white">
              <option value="">Selecione o software cadastrado</option>
              {softwares.map(s => (
                <option key={s.id} value={s.id}>{s.nome} {s.qtd_contratada>0? ` - BALDE ${s.qtd_contratada}` : ` (consome do ${s.familia})`}</option>
              ))}
            </select>
            <p className="text-[11px] text-[#64748b]">Ao salvar, desconta 1 do total 629 e atualiza o dashboard na hora.</p>
            <div className="flex gap-2"><button onClick={()=>setShowForm(false)} className="flex-1 border border-[#1e293b] py-2 rounded text-white">Cancelar</button><button onClick={handleSave} className="flex-1 bg-[#D4AF37] py-2 rounded font-bold">Salvar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
export default LicencasTable;
