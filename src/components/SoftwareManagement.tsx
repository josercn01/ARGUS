import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, Plus, Pencil, Trash2, X, Save, Trash } from 'lucide-react';

type Software = {
  id: string;
  nome: string;
  familia: 'ALL_APPS' | 'ACROBAT' | 'SINGLE_POOL';
  qtd_contratada: number;
};

export function SoftwareManagement() {
  const [softwares, setSoftwares] = useState<Software[]>([]);
  const [uso, setUso] = useState<Record<string, number>>({});
  const [modalItem, setModalItem] = useState<Partial<Software> | null>(null);

  async function load() {
    const { data: sw } = await supabase.from('softwares').select('*').order('nome');
    setSoftwares(sw as any || []);

    // conta quantos usuários usam cada software
    const { data: users } = await supabase.from('usuarios').select('software_id');
    const count: Record<string, number> = {};
    users?.forEach((u: any) => { count[u.software_id] = (count[u.software_id] || 0) + 1 });
    setUso(count);
  }
  useEffect(() => { load(); }, []);

  async function handleSave(data: Partial<Software>) {
    const isFamilia = ['ALL_APPS','ACROBAT','SINGLE_POOL'].includes(data.nome?.toUpperCase() || '') || (data.qtd_contratada||0) > 0;

    const payload = {
      nome: data.nome,
      familia: data.familia || 'SINGLE_POOL',
      qtd_contratada: isFamilia || data.familia!== 'SINGLE_POOL'? (data.qtd_contratada || 0) : 0,
    };

    if (data.id) {
      await supabase.from('softwares').update(payload).eq('id', data.id);
    } else {
      // se for filho tipo Photoshop, ele entra no balde SINGLE_POOL com qtd 0
      await supabase.from('softwares').insert(payload);
    }
    setModalItem(null);
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir? Se tiver usuários usando, vai dar erro de vínculo.')) return;
    await supabase.from('softwares').delete().eq('id', id);
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between">
        <h2 className="text-white font-bold text-xl flex items-center gap-2"><Package className="w-5 h-5 text-[#D4AF37]" />Catálogo - Cadastrar Softwares</h2>
        <button onClick={() => setModalItem({ familia: 'SINGLE_POOL', qtd_contratada: 0 })} className="flex items-center gap-2 text-sm bg-[#D4AF37] text-[#001726] font-bold px-4 py-2.5 rounded-lg"><Plus className="w-4 h-4" />Novo Software</button>
      </div>

      <div className="bg-[#001E33] border border-[#1e293b] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#001726] border-b border-[#1e293b]"><tr><th className="px-4 py-3 text-xs text-[#94a3b8]">Software (Tipo que aparece no filtro)</th><th className="px-4 py-3 text-xs text-[#94a3b8]">Família / Balde</th><th className="px-4 py-3 text-xs text-[#94a3b8]">Contratado</th><th className="px-4 py-3 text-xs text-[#94a3b8]">Em Uso</th><th className="w-20"></th></tr></thead>
          <tbody className="divide-y divide-[#1e293b]">
            {softwares.map(s => (
              <tr key={s.id} className="hover:bg-[#001726]/50">
                <td className="px-4 py-3 text-white text-sm">{s.nome} {s.qtd_contratada===0 && <span className="text-[10px] bg-[#1a2332] px-1 rounded">filho do balde</span>}</td>
                <td className="px-4 py-3 text-xs text-[#94a3b8]">{s.familia}</td>
                <td className="px-4 py-3 text-sm text-[#D4AF37]">{s.qtd_contratada > 0? s.qtd_contratada : '-'}</td>
                <td className="px-4 py-3 text-sm text-white">{uso[s.id] || 0}</td>
                <td className="px-4 py-3 flex gap-1"><button onClick={() => setModalItem(s)}><Pencil className="w-4 h-4 text-white" /></button><button onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-red-400" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalItem!== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#001E33] p-6 rounded-xl w-[400px] border border-[#1e293b]">
            <div className="flex justify-between mb-4"><h3 className="text-white font-bold">Cadastrar Software</h3><button onClick={() => setModalItem(null)}><X className="w-5 h-5 text-white" /></button></div>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(modalItem); }} className="space-y-3">
              <input value={modalItem.nome || ''} onChange={e => setModalItem({...modalItem, nome: e.target.value})} className="w-full bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2 text-white" placeholder="Nome ex: Photoshop, Illustrator, AutoCAD" required />
              <select value={modalItem.familia} onChange={e => setModalItem({...modalItem, familia: e.target.value as any})} className="w-full bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2 text-white">
                <option value="SINGLE_POOL">POOL Single App (225) - consome do balde</option>
                <option value="ALL_APPS">Todos os Apps - Edição 4 (202)</option>
                <option value="ACROBAT">Acrobat Pro DC (202)</option>
              </select>
              <input type="number" value={modalItem.qtd_contratada || 0} onChange={e => setModalItem({...modalItem, qtd_contratada: parseInt(e.target.value)})} className="w-full bg-[#001726] border border-[#1e293b] rounded-lg px-3 py-2 text-white" placeholder="Qtd Contratada (0 para filho)" />
              <p className="text-[11px] text-[#64748b]">Se for Photoshop, InDesign, etc, deixa Qtd = 0 e escolhe SINGLE_POOL. Ele vai consumir do balde 225.</p>
              <button type="submit" className="w-full bg-[#D4AF37] px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2"><Save className="w-4 h-4" />Salvar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default SoftwareManagement;
